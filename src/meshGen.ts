import basicVert from './shaders/basic.vert.wgsl?raw'
import positionFrag from './shaders/position.frag.wgsl?raw'
import * as cube from './util/cubegen'
import { getMvpMatrix } from './util/math'

// initialize webgpu device & config canvas context
async function initWebGPU(canvas: HTMLCanvasElement) {
    if(!navigator.gpu)
        throw new Error('Not Support WebGPU')
    const adapter = await navigator.gpu.requestAdapter()
    if (!adapter)
        throw new Error('No Adapter Found')
    const device = await adapter.requestDevice()
    const context = canvas.getContext('webgpu') as GPUCanvasContext
    const format = navigator.gpu.getPreferredCanvasFormat()
    const devicePixelRatio = window.devicePixelRatio || 1
    canvas.width = canvas.clientWidth * devicePixelRatio
    canvas.height = canvas.clientHeight * devicePixelRatio
    const size = {width: canvas.width, height: canvas.height}
    context.configure({
        device, format,
        // prevent chrome warning after v102
        alphaMode: 'opaque'
    })
    return {device, context, format, size}
}

// create pipiline & buffers
async function initPipeline(device: GPUDevice, format: GPUTextureFormat, size:{width:number, height:number}) {
    const pipeline = await device.createRenderPipelineAsync({
        label: 'Basic Pipline',
        layout: 'auto',
        vertex: {
            module: device.createShaderModule({
                code: basicVert,
            }),
            entryPoint: 'main',
            buffers: [{
                arrayStride: 5 * 4, // 3 position 2 uv,
                attributes: [
                    {
                        // position
                        shaderLocation: 0,
                        offset: 0,
                        format: 'float32x3',
                    },
                    {
                        // uv
                        shaderLocation: 1,
                        offset: 3 * 4,
                        format: 'float32x2',
                    }
                ]
            }]
        },
        fragment: {
            module: device.createShaderModule({
                code: positionFrag,
            }),
            entryPoint: 'main',
            targets: [
                {
                    format: format
                }
            ]
        },
        primitive: {
            topology: 'triangle-list',
            // Culling backfaces pointing away from the camera
            cullMode: 'none'
        },
        // Enable depth testing since we have z-level positions
        // Fragment closest to the camera is rendered in front
        depthStencil: {
            depthWriteEnabled: true,
            depthCompare: 'less',
            format: 'depth24plus',
        }
    } as GPURenderPipelineDescriptor)
    // create depthTexture for renderPass
    const depthTexture = device.createTexture({
        size, format: 'depth24plus',
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
    })
    const depthView = depthTexture.createView()
    // create vertex buffer
    const vertexBuffer = device.createBuffer({
        label: 'GPUBuffer store vertex',
        size: cube.vertex.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    })
    device.queue.writeBuffer(vertexBuffer, 0, cube.vertex)
    // create a 4x4 mvp matrix1
    const mvpBuffer1 = device.createBuffer({
        label: 'GPUBuffer store 4x4 matrix1',
        size: 4 * 4 * 4, // 4 x 4 x float32
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    })
    // create a uniform group for Matrix2
    const group1 = device.createBindGroup({
        label: 'Uniform Group with matrix1',
        layout: pipeline.getBindGroupLayout(0),
        entries: [
            {
                binding: 0,
                resource: {
                    buffer: mvpBuffer1
                }
            }
        ]
    })
    // create a 4x4 mvp matrix2
    const mvpBuffer2 = device.createBuffer({
        label: 'GPUBuffer store 4x4 matrix2',
        size: 4 * 4 * 4, // 4 x 4 x float32
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    })
    // create a uniform group for Matrix2
    const group2 = device.createBindGroup({
        label: 'Uniform Group with matrix2',
        layout: pipeline.getBindGroupLayout(0),
        entries: [
            {
                binding: 0,
                resource: {
                    buffer: mvpBuffer2
                }
            }
        ]
    })
    // return all vars
    return {pipeline, depthTexture, depthView, vertexBuffer, mvpBuffer1, mvpBuffer2, group1, group2}
}

// create & submit device commands
function draw(
    device: GPUDevice, 
    context: GPUCanvasContext,
    pipelineObj: {
        pipeline: GPURenderPipeline,
        vertexBuffer: GPUBuffer,
        mvpBuffer1: GPUBuffer,
        mvpBuffer2: GPUBuffer,
        group1: GPUBindGroup,
        group2: GPUBindGroup,
        depthView: GPUTextureView
    }
) {
    // start encoder
    const commandEncoder = device.createCommandEncoder()
    const renderPassDescriptor: GPURenderPassDescriptor = {
        colorAttachments: [
            {
                view: context.getCurrentTexture().createView(),
                clearValue: { r: 0, g: 0, b: 0, a: 1.0 },
                loadOp: 'clear',
                storeOp: 'store'
            }
        ],
        depthStencilAttachment: {
            view: pipelineObj.depthView,
            depthClearValue: 1.0,
            depthLoadOp: 'clear',
            depthStoreOp: 'store',
        }
    }
    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor)
    passEncoder.setPipeline(pipelineObj.pipeline)
    // set vertex
    passEncoder.setVertexBuffer(0, pipelineObj.vertexBuffer)
    {
        // draw first cube
        passEncoder.setBindGroup(0, pipelineObj.group1)
        passEncoder.draw(cube.vertexCount)
        // draw second cube
        passEncoder.setBindGroup(0, pipelineObj.group2)
        passEncoder.draw(cube.vertexCount)
    }
    passEncoder.end()
    // webgpu run in a separate process, all the commands will be executed after submit
    device.queue.submit([commandEncoder.finish()])
}

async function run(){
    const canvas = document.querySelector('canvas')
    if (!canvas)
        throw new Error('No Canvas')
    const {device, context, format, size} = await initWebGPU(canvas)
    const pipelineObj = await initPipeline(device, format, size)
    // defaut state
    let aspect = size.width/ size.height
    const position1 = {x:2, y:0, z: -8}
    const rotation1 = {x: 0, y: 0, z:0}
    const scale1 = {x:1, y:1, z: 1}
    const position2 = {x:-2, y:0, z: -8}
    const rotation2 = {x: 0, y: 0, z:0}
    const scale2 = {x:1, y:1, z: 1}
    // start loop
    function frame(){
        // first, update two transform matrixs
        const now = Date.now() / 1000
        {
            // first cube
            rotation1.x = Math.sin(now)
            rotation1.y = Math.cos(now)
            const mvpMatrix1 = getMvpMatrix(aspect, position1, rotation1, scale1)
            device.queue.writeBuffer(
                pipelineObj.mvpBuffer1,
                0,
                mvpMatrix1
            )
        }
        {
            // second cube
            rotation2.x = Math.cos(now)
            rotation2.y = Math.sin(now)
            const mvpMatrix2 = getMvpMatrix(aspect, position2, rotation2, scale2)
            device.queue.writeBuffer(
                pipelineObj.mvpBuffer2,
                0,
                mvpMatrix2
            )
        }
        // then draw
        draw(device, context, pipelineObj)
        requestAnimationFrame(frame)
    }
    frame()

    // re-configure context on resize
    window.addEventListener('resize', ()=>{
        size.width = canvas.width = canvas.clientWidth * devicePixelRatio
        size.height = canvas.height = canvas.clientHeight * devicePixelRatio
        // don't need to recall context.configure() after v104
        // re-create depth texture
        pipelineObj.depthTexture.destroy()
        pipelineObj.depthTexture = device.createTexture({
            size, format: 'depth24plus',
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
        })
        pipelineObj.depthView = pipelineObj.depthTexture.createView()
        // update aspect
        aspect = size.width/ size.height
    })
}
run()