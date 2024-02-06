import triangleVert from './shaders/triangle.vert.wgsl?raw'
import redFrag from './shaders/red.frag.wgsl?raw'


const shader1 = `
@binding(0) @group(0) var<storage, read> vox2dData : array<i32>;
@vertex
fn main(@builtin(vertex_index) VertexIndex : u32) -> @builtin(position) vec4<f32> {
     var localpos = array<vec2<f32>, 6>(
        vec2<f32>(-1, 1),
        vec2<f32>(-1, -1),
        vec2<f32>(1, -1),
        vec2<f32>(1, -1),
        vec2<f32>(1, 1),
        vec2<f32>(-1, 1),
    );

    var t_id =VertexIndex/6;
    var voxel_id=vox2dData[t_id];
    var x=voxel_id/10;
    var y=voxel_id%10;
    var gpos = vec2<f32>(f32(x*2),f32(y*2));

    return vec4<f32>(localpos[(VertexIndex)%6]*0.01+gpos*0.01, 0.0, 1.0);
}
`;
const shader2 = `
@fragment
fn main() -> @location(0) vec4<f32> {
    return vec4<f32>(0.0, 0.0, 1.0, 1.0);
}
`;

// initialize webgpu device & config canvas context
async function initWebGPU(canvas: HTMLCanvasElement) {
    if(!navigator.gpu)
        throw new Error('Not Support WebGPU')
    const adapter = await navigator.gpu.requestAdapter({
        powerPreference: 'high-performance'
        // powerPreference: 'low-power'
    })
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
        // json specific format when key and value are the same
        device, format,
        // prevent chrome warning
        alphaMode: 'opaque'
    })
    return {device, context, format, size}
}
// create a simple pipiline
const NUM=100;
async function initPipeline(device: GPUDevice, format: GPUTextureFormat) {
    const descriptor: GPURenderPipelineDescriptor = {
        layout: 'auto',
        vertex: {
            module: device.createShaderModule({
                code: shader1,
            }),
            entryPoint: 'main'
        },
        primitive: {
            topology: 'triangle-list' // try point-list, line-list, line-strip, triangle-strip?
        },
        fragment: {
            module: device.createShaderModule({
                code: shader2,
            }),
            entryPoint: 'main',
            targets: [
                {
                    format: format
                }
            ]
        }
    }
    const pipeline=await device.createRenderPipelineAsync(descriptor);
    const voxBuffer = device.createBuffer({
        label: 'GPUBuffer store voxel id',
        size: 4*NUM, //  int x NUM
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    })
    const group = device.createBindGroup({
        label: 'GPUBuffer store voxel id',
        layout: pipeline.getBindGroupLayout(0),
        entries: [
            {
                binding: 0,
                resource: {
                    buffer: voxBuffer
                }
            }
        ]
    })
    return {pipeline,group,voxBuffer};
}
// create & submit device commands
function draw(device: GPUDevice, context: GPUCanvasContext, 
    pipelineOBJ: {pipeline:GPURenderPipeline, voxBuffer:GPUBuffer,group:GPUBindGroup}) {
    const commandEncoder = device.createCommandEncoder()
    const view = context.getCurrentTexture().createView()
    const renderPassDescriptor: GPURenderPassDescriptor = {
        colorAttachments: [
            {
                view: view,
                clearValue: { r: 0, g: 0, b: 0, a: 1.0 },
                loadOp: 'clear', // clear/load
                storeOp: 'store' // store/discard
            }
        ]
    }
    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor)
    passEncoder.setPipeline(pipelineOBJ.pipeline)
    // 3 vertex form a triangle
    var jsBuffer=new Int32Array(NUM)
    var bufferSize=0
    for(let xi = 0; xi < 10; xi++){
        for(let yi = 0; yi < 10; yi++){
            if((xi-5)*(xi-5)+(yi-5)*(yi-5)<25){
                var value=(10*yi+xi);
                jsBuffer[bufferSize]=value;
                bufferSize++;
            }     
        }
    }
    device.queue.writeBuffer(pipelineOBJ.voxBuffer, 0, jsBuffer)
    passEncoder.setBindGroup(0, pipelineOBJ.group)
    passEncoder.draw(6*bufferSize)
    passEncoder.end()
    // webgpu run in a separate process, all the commands will be executed after submit
    device.queue.submit([commandEncoder.finish()])
}

async function run(){
    const canvas = document.querySelector('canvas')
    if (!canvas)
        throw new Error('No Canvas')
    const {device, context, format} = await initWebGPU(canvas)
    const pipelineOBJ= await initPipeline(device, format)
    // start draw
    draw(device, context, pipelineOBJ)
    
    // re-configure context on resize
    window.addEventListener('resize', ()=>{
        canvas.width = canvas.clientWidth * devicePixelRatio
        canvas.height = canvas.clientHeight * devicePixelRatio
        // don't need to recall context.configure() after v104
        draw(device, context, pipelineOBJ)
    })
}
run()