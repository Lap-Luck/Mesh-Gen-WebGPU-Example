function get_face(full_state:Int8Array,axis:number,is0:number){
    var k=Math.pow(2,axis);
    var j=0;
    var state=new Int8Array(4);
    for(var i=0;i<8;i++){
        if(((i&k)/k)%2==is0){
            state[j]=full_state[i];
            j++;
        }
    }
    var orientation=(axis!=1?1:0)^is0;
    return {state,orientation};
}


function face_state2edges(info:{state:Int8Array,orientation:number}){
    var a_points=[]
    var cykle=[0,1,3,2]
    for(var i=0;i<4;i++){
        if(info.state[cykle[i]]!=info.state[cykle[(i+1)%4]]){
            a_points.push(i)
        }
    }
    if( (info.state[0]==1) && (a_points.length>0)){
        a_points.push(a_points.shift())
    }
    var orientation=info.orientation
    var points=a_points as number[]
    return {points,orientation}
}


function face_edge_to_global(id:number,axis:number,is0:number){
    var cykle=[0,1,3,2]
    var a=cykle[id]
    var b=cykle[(id+1)%4]
    var local_egde_axis=((a^b)==1?1:0)
    var local_egde={
        axis:local_egde_axis,
        is0:(((a&Math.pow(2,local_egde_axis))==0)?0:1)
    }
    //console.log(local_egde.axis,"---",local_egde.is0,"(",a&Math.pow(2,axis))
    var g_axis=local_egde.axis+((axis<=local_egde.axis)?1:0)
    var unused_axsis=0+1+2-g_axis-axis
    var is0is0=(g_axis>axis)?(local_egde.is0*2+is0):(local_egde.is0+2*is0)
    return {unused_axsis,is0is0}
}

function cube_edges(full_state:Int8Array){
    var pairs=[]
    for(var axis=0;axis<3;axis++){
        for(var is0=0;is0<2;is0++){
            var edges=face_state2edges(get_face(full_state,axis,is0))
            //console.log("___")
            //console.log(edges.points)
            //console.log("___")
            var global_edges=edges.points.map(e=>face_edge_to_global(e,axis,is0))

            if(edges.orientation==0){
                for(var i=0;i<global_edges.length/2;i++){
                    var start_edge=global_edges[2*i]
                    var end_edge=global_edges[2*i+1]
                    var pair={start_edge,end_edge}
                    pairs.push(pair)
                }
            }
            if(edges.orientation==1){
                for(var i=0;i<global_edges.length/2;i++){
                    var start_edge=global_edges[2*i+1]
                    var end_edge=global_edges[2*i]
                    var pair={start_edge,end_edge}
                    pairs.push(pair)
                }
            }
        }
    }
    return pairs;
}

function edges2faces(edges_int:number[][]){
    //convert [[6, 10], [4, 8], [11, 7], [9, 5], [8, 9], [10, 11], [5, 4], [7, 6]]
    //to [[6,10,11,7],[4,8,9,5]]
    var is_active=new Int8Array(edges_int.length)
    is_active.fill(1)
    var active_count=is_active.length;
    var res:number[][]=[]
    while(active_count>0){
        //console.log("______")
        var start_edge_id=is_active.indexOf(1)
        is_active[start_edge_id]=0;active_count--;
        var polygon=[]
        var start=edges_int[start_edge_id][0]
        var end=edges_int[start_edge_id][1]
        polygon.push(start)
        //polygon.push(end)
        while(start!=end){
            for(var i=0;i<edges_int.length;i++){if(is_active[i]==1){
                if(edges_int[i][0]==end){
                    is_active[i]=0;active_count--;
                    polygon.push(end)
                    end=edges_int[i][1]
                    break
                }
            }}
        }
        res.push(polygon)
    }

    return res
}

export function list_tringles(full_state:Int8Array){

    var cube_e=cube_edges(full_state)
    var edges_int=cube_e.map(e=>
        [
            e.start_edge.is0is0+4*e.start_edge.unused_axsis,
            e.end_edge.is0is0+4*e.end_edge.unused_axsis
        ]
        )
    console.log(edges_int)
    var faces:number[][]=edges2faces(edges_int)
    console.log(faces)
    var res:number[][]=[]
    for(var face_i=0;face_i<faces.length;face_i++){
        for(var id=0;id<faces[face_i].length-2;id++){
            var triangle:number[]=[faces[face_i][0],faces[face_i][1+id],faces[face_i][2+id]]
            res.push(triangle)
        }
    }

    return res
}

//list_tringles(new Int8Array([1,1,0,0,0,0,0,0]))

const id_2vec=[[0.5,0,0],[0.5,1,0],[0.5,0,1],[0.5,1,1],
[0,0.5,0],[1,0.5,0],[0,0.5,1],[1,0.5,1],
[0,0,0.5],[1,0,0.5],[0,1,0.5],[1,1,0.5]]

export {id_2vec}