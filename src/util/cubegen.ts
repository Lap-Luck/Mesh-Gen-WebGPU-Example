import * as generator from './cubegen_api'
class Float32List {
    fill: number;
    data:Float32Array;
   
    constructor(maxSize: number) {
      this.fill = 0;
      this.data=new Float32Array(maxSize);
    }
   
    add(element: number){
        this.data[this.fill]=element;
        this.fill=this.fill+1;
    }

    toArray(){
        return this.data.slice(0,this.fill);
    }
}




function gen(){
    var state=new Int8Array([1,1,0,0,1,0,1,1])
    const cube=new Float32Array([
        // float3 position, float2 uv
        // face1
        +1, -1, +1,    1, 1,
        -1, -1, +1,    0, 1,
        -1, -1, -1,    0, 0,
        +1, -1, -1,    1, 0,
        +1, -1, +1,    1, 1,
        -1, -1, -1,    0, 0,
        // face2
        +1, +1, +1,    1, 1,
        +1, -1, +1,    0, 1,
        +1, -1, -1,    0, 0,
        +1, +1, -1,    1, 0,
        +1, +1, +1,    1, 1,
        +1, -1, -1,    0, 0,
        // face3
        -1, +1, +1,    1, 1,
        +1, +1, +1,    0, 1,
        +1, +1, -1,    0, 0,
        -1, +1, -1,    1, 0,
        -1, +1, +1,    1, 1,
        +1, +1, -1,    0, 0,
        // face4
        -1, -1, +1,    1, 1,
        -1, +1, +1,    0, 1,
        -1, +1, -1,    0, 0,
        -1, -1, -1,    1, 0,
        -1, -1, +1,    1, 1,
        -1, +1, -1,    0, 0,
        // face5
        +1, +1, +1,    1, 1,
        -1, +1, +1,    0, 1,
        -1, -1, +1,    0, 0,
        -1, -1, +1,    0, 0,
        +1, -1, +1,    1, 0,
        +1, +1, +1,    1, 1,
        // face6
        +1, -1, -1,    1, 1,
        -1, -1, -1,    0, 1,
        -1, +1, -1,    0, 0,
        +1, +1, -1,    1, 0,
        +1, -1, -1,    1, 1,
        -1, +1, -1,    0, 0
    ])

    var CubesCount=8;
    var res=new Float32List(10000)//CubesCount*cube.length
    for(var i=0;i<CubesCount;i++){
        if(state[i]==1){
            for(var vId=0;vId<cube.length;vId++){
                var offsetX=i%2
                var offsetY=(~~(i/2))%2
                var offsetZ=~~((~~(i/2))/2)
                var offset=((vId%5==0)?offsetX:0)+((vId%5==1)?offsetY:0)+((vId%5==2)?offsetZ:0)-0.5
                //res[i*cube.length+vId]=cube[vId]*0.1+offset*1.0;
                res.add(cube[vId]*0.1+offset*1.0)
            }
        } 
    }
    
    /*
    var tab=new Float32Array([
        // float3 position, float2 uv
        // face1
        +1, -1, +1,    1, 1,
        -1, -1, +1,    0, 1,
        -1, -1, -1,    0, 0,
        +1, -1, -1,    1, 0,
        +1, -1, +1,    1, 1,
        -1, -1, -1,    0, 0,
    ])*/

    var state_extend=new Int8Array(4*4*4)
    for(var x=0;x<4;x++){
        for(var y=0;y<4;y++){
            for(var z=0;z<4;z++){
                state_extend[x+y*4+z*16]=0
            }
        }
    }
    for(var x=0;x<2;x++){
        for(var y=0;y<2;y++){
            for(var z=0;z<2;z++){
                state_extend[(x+1)+(y+1)*4+(z+1)*16]=state[x+y*2+z*4]
            }
        }
    }

    for(var x=0;x<3;x++){
        for(var y=0;y<3;y++){
            for(var z=0;z<3;z++){
                var sub_state=new Int8Array([
                    state_extend[(x)+(y)*4+(z)*16],
                    state_extend[(x+1)+(y)*4+(z)*16],
                    state_extend[(x)+(y+1)*4+(z)*16],
                    state_extend[(x+1)+(y+1)*4+(z)*16],
                    state_extend[(x)+(y)*4+(z+1)*16],
                    state_extend[(x+1)+(y)*4+(z+1)*16],
                    state_extend[(x)+(y+1)*4+(z+1)*16],
                    state_extend[(x+1)+(y+1)*4+(z+1)*16]


                ])
                var triangles=generator.list_tringles(sub_state)

                for(var i=0;i<triangles.length;i++){
                    var tr=triangles[i]
                    var A=generator.id_2vec[tr[0]]
                    var B=generator.id_2vec[tr[1]]
                    var C=generator.id_2vec[tr[2]]
                    var tab=new Float32Array([
                        // float3 position, float2 uv
                        // face1
                        A[0]+x,A[1]+y,A[2]+z,0,0,
                        B[0]+x,B[1]+y,B[2]+z,0,0,
                        C[0]+x,C[1]+y,C[2]+z,0,0,
                    ])
                    for(var id=0;id<tab.length;id++){
                        res.add(tab[id]-1);
                    }
                }
            }
        }
    }

    return res.toArray()
}

const vertex = gen() 
const atributesCount=5
const vertexCount = vertex.length/atributesCount;

export {vertex, vertexCount}