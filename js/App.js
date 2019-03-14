let canvas;
let gl;

let angle_x = 0;
let angle_y = 0;
let gear_id = 0;

let vShaders = [];
let fShaders = [];
let shaderProgram;
let programInfo;

let buffers = [];

let initialized = false;
let tick = 0;
let timeDelta = 0;
let lastTimeDelta = 0;
let camera = [0, 0, 0];
// let controlPoints = [
//     [-2, -5, -5],
//     [-0, 0, -2.5],
//     [1, 5, 4],
//     [3, 0, 10]
// ];

let centerX = 0;
let centerY = 0;
let centerZ = 0;
let upDX = 0;
let upDY = 1;
let upDZ = 0;

let controlPoints = [
    [0.4, 0.4, 5],
    [0.4, 0.4, 2.5],
    [0.4, 0.4, 0],
    [0.4, 0.4, -2.5]
]

function resetCamera() {
    camera[0] = 0;
    camera[1] = 0;
    camera[2] = 0;
}

function weight(tick) {
    return [
        Math.pow(1 - tick, 3),
        3 * Math.pow(1 - tick, 2) * tick,
        3 * (1 - tick) * Math.pow(tick, 2),
        Math.pow(tick, 3)
    ]
}

function update(delta) {
    tick = tick % 100;
    let weights = weight(tick / 100);

    resetCamera();

    for (let i = 0; i < 4; i++) {
        camera[0] += weights[i] * controlPoints[i][0];
        camera[1] += weights[i] * controlPoints[i][1];
        camera[2] += weights[i] * controlPoints[i][2];
    }

    // centerX = camera[0];
    // centerY = camera[1];
    // centerZ = camera[2] - 1;
}


//
// Draw the scene.
//
function draw() {
    webglUtils.resizeCanvasToDisplaySize(canvas);

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);  // Clear to white, fully opaque
    gl.clearDepth(1.0);                 // Clear everything
    gl.enable(gl.DEPTH_TEST);           // Enable depth testing
    gl.depthFunc(gl.LEQUAL);            // Near things obscure far things

    // Clear the canvas before we start drawing on it.

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    //make transform to implement interactive rotation

    let matrix = new Learn_webgl_matrix();
    let lookAt = matrix.create();

    matrix.lookAt(lookAt,
        camera[0], camera[1], camera[2],
        centerX, centerY, centerZ,
        upDX, upDY, upDZ);

    let projection = matrix.createFrustum(-.01, .01, -.01, .01, .03, 1000);
    let xRotate = matrix.create();
    let yRotate = matrix.create();
    let pvmTransform = matrix.create();
    let vmTransform = matrix.create();
    let scale = matrix.create();

    matrix.scale(scale, 0.8, 0.8, 0.8);
    matrix.rotate(xRotate, angle_x, 1, 0, 0);
    matrix.rotate(yRotate, angle_y, 0, 1, 0);

    // Combine the two rotations into a single transformation
    matrix.multiplySeries(pvmTransform, projection, lookAt,
            xRotate, yRotate, scale);
        matrix.multiplySeries(vmTransform, lookAt,
            xRotate, yRotate, scale);

    // matrix.multiplySeries(pvmTransform, projection, lookAt, scale);
    // matrix.multiplySeries(vmTransform, lookAt, scale);

    // gl.uniformMatrix4fv(programInfo.locations.u_PVM_transform, false, pvmTransform);
    gl.uniformMatrix4fv(programInfo.locations.u_PVM_transform, false, pvmTransform);
    // Set the shader program's uniform
    gl.uniformMatrix4fv(programInfo.locations.u_VM_transform, false, vmTransform);


    gl.uniform3f(programInfo.locations.u_light_dir, 1, 1, 1);

    gl.uniform3f(programInfo.locations.u_light_color, 1.0, 1.0, 1.0);
    gl.uniform1f(programInfo.locations.u_shininess, 85);
    gl.uniform3f(programInfo.locations.u_ambient_color, 0.2, 0.2, 0.2);

    { // now tell the shader (GPU program) to draw some triangles
        const offset = 0;
        gl.drawArrays(gl.TRIANGLES, offset, buffers.num_vertices);
    }
}

function init() {
    canvas = document.querySelector('#glcanvas');
    gl = canvas.getContext('webgl', {antialias: true});

    downloadShaders([
        './shaders/Global.vert',
        './shaders/Global.frag'
    ]);

    // If we don't have a GL context, give up now
    if (!gl) {
        alert('Unable to initialize WebGL. Your browser or machine may not support it.');
        return;
    }

    // Vertex shader program, runs on GPU, once per vertex

    // Fragment shader program, runs on GPU, once per potential pixel

    // Initialize a shader program; this is where all
    // the lighting for the objects, if any, is established.
    shaderProgram = initShaderProgram(gl, vShaders[0], fShaders[0]);

    // Tell WebGL to use our program when drawing
    gl.useProgram(shaderProgram);

    // Collect all the info needed to use the shader program.
    // Look up locations of attributes and uniforms used by
    // our shader program
    programInfo = {
        program: shaderProgram,
        locations: {
            a_vertex: gl.getAttribLocation(shaderProgram, 'a_Vertex'),
            a_color: gl.getAttribLocation(shaderProgram, 'a_Color'),
            a_normal: gl.getAttribLocation(shaderProgram, 'a_Vertex_normal'),
            u_light_dir: gl.getUniformLocation(shaderProgram, 'u_Light_position'),
            u_light_color: gl.getUniformLocation(shaderProgram, 'u_Light_color'),
            u_shininess: gl.getUniformLocation(shaderProgram, 'u_Shininess'),
            u_ambient_color: gl.getUniformLocation(shaderProgram, 'u_Ambient_color'),
            u_PVM_transform: gl.getUniformLocation(shaderProgram, 'u_PVM_transform'),
            u_VM_transform: gl.getUniformLocation(shaderProgram, 'u_VM_transform')

        }
    };

    // add an event handler so we can interactively rotate the model
    document.addEventListener('keydown', function (evenast) {
        if (event.keyCode == 37) {   //left
            angle_y -= 3;
        } else if (event.keyCode == 38) {  //top
            angle_x -= 3;
        } else if (event.keyCode == 39) {  //right
            angle_y += 3;
        } else if (event.keyCode == 40) {  //bottom
            angle_x += 3;
        } else if (event.keyCode == 13 || event.keyCode == 8) {  //enter  or backspace
            let gear_id_change;

            if (event.keyCode == 13)
                gear_id_change = 1;
            else
                gear_id_change = -1;

            gear_id += gear_id_change;

            if (gear_id < 0)
                gear_id = 0;
            if (gear_id > 28)
                gear_id = 28;

            console.log('Gear ID = ', gear_id);
            loadScene();
        }

        draw();
    });

    initialized = true;
}

function loadScene() {
    // build the object(s) we'll be drawing, put the data in buffers
    buffers = initBuffers(gl, programInfo, gear_id);

    enableAttributes();
}

function loop() {
    let delta = (timeDelta - lastTimeDelta) / 1000;
    tick += 1;

    update(delta);
    draw();
}

function main() {
    init();

    if (!initialized) return;

    loadScene();

    window.requestAnimationFrame(function callback(time) {
        timeDelta = time;
        loop();
        window.requestAnimationFrame(callback);
        lastTimeDelta = timeDelta;
    });
}

//
// initBuffers
//
// Initialize the buffers we'll need. For this demo, we just
// have one object -- a simple two-dimensional square.
//
function initBuffers(gl, programInfo, gear_id) {
    let gearData;

    switch (gear_id) {
        case 0:
            gearData = ArmoniAthertonGear(30, 30);
            break;

        case 1:
            gearData = joshAthertonGear(40, 20);
            break;

        case 2:
            var gearInfo = {
                numTeeth: 30,
                numSpokes: 12
            };
            gearData = beveridgeGear(gearInfo.numTeeth, gearInfo.numSpokes);
            break;

        case 3:
            gearData = brendelGear(30, 6, 0.3); //20 Teeth, 5 Spokes, 0.1 Width.
            break;

        case 4:
            gearData = cannonGear(30, 10);
            break;

        case 5:
            gearData = doanGear(40, 5);
            break;

        case 6:
            gearData = michaelfultonGear(40, 4);
            break;

        case 7:
            gearData = inoueGear();
            break;

        case 8:
            gearData = mjostenGear(20, 4);
            break;

        case 9:
            gearData = kimGear(40, 6);
            break;

        case 10:
            gearData = kuduvaGear(20, 10);
            break;

        case 11:
            gearData = evandlGear(40, 4, 0.5);
            break;

        case 12:
            gearData = marcusGear(16, 8);
            break;

        case 13:
            gearData = createBMathewGear(30, 8, 70, 70, 85, 95, 5, 5, 5, 218 / 255, 165 / 255, 32 / 255);
            break;

        case 14:
            gearData = millerGear(20, 8);
            break;

        case 15:
            gearData = anhnguyenGear(20, 8);
            break;

        case 16:
            gearData = osbornemGear(10, 10);
            break;

        case 17:
            // numberOfTeeth, numberOfSpokes, circlizer, spokeFraction, spokeZFatness,smallCoinFactor, red, green, blue
            gearData = createOxfordGear(20, 10, 1, 7, 5, .25, 75, 0, 130);
            break;

        case 18:
            gearData = perezGear(20, 20);
            break;

        case 19:
            gearData = createtommypGear();
            break;

        case 20:
            const METAL_GEAR = {
                toothCount: 16,
                spokeCount: 16,
                r1: 0.15,
                r2: 0.32,
                spokeRad: 0.03,
                outerThickness: .1,
                innerThickness: .06,
                teethHeight: .1,
                outerColor: METAL0,
                innerColor: METAL1,
                toothOuterColor: METAL3,
                toothInnerColor: METAL2,
                dullness: 4
            };
            gearData = scottGear(METAL_GEAR);
            break;

        case 21:
            let numTeeth = 40;
            let numSpokes = 13;
            let teethSlant = 4;
            let centerRadius = 0.3;
            let outerWidth = 0.2;
            gearData = nathanRuesGear(numTeeth, numSpokes, teethSlant, centerRadius, outerWidth);
            break;

        case 22:
            gearData = tarabiGear(20, 10);
            break;

        case 23:
            gearData = tovarGear(30, 4);
            break;

        case 24:
            gearData = createAllenT94Gear(40, 10);
            break;

        case 25:
            gearData = jenzelVillanuevaGear(20, 5);
            break;

        case 26:
            gearData = walshGear(25, 7, 1.15, 3.5);
            break;

        case 27:
            gearData = jakeYangGear(20, 30);
            break;

        case 28:
            gearData = yuenGear(30, 20);
            break;

    }

    const vertices = gearData[0];
    const colors = gearData[1];
    const normals = gearData[2];

    // Create  buffers for the object's vertex positions
    const vertexBuffer = gl.createBuffer();

    // Select the positionBuffer as the one to apply buffer
    // operations to from here out.
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

    // Now pass the list of vertices to the GPU to build the
    // shape. We do this by creating a Float32Array from the
    // JavaScript array, then use it to fill the current buffer.
    gl.bufferData(gl.ARRAY_BUFFER,
        new Float32Array(vertices),
        gl.STATIC_DRAW);


    // do likewise for colors
    const colorBuffer = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);

    gl.bufferData(gl.ARRAY_BUFFER,
        new Float32Array(colors),
        gl.STATIC_DRAW);


    const normalBuffer = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);

    gl.bufferData(gl.ARRAY_BUFFER,
        new Float32Array(normals),
        gl.STATIC_DRAW);

    return {
        // each vertex in buffer has 3 floats
        num_vertices: vertices.length / 3,
        vertex: vertexBuffer,
        color: colorBuffer,
        normal: normalBuffer
    };

}

function downloadShader(path) {
    $.ajax({
        url: path,
        success: function (data) {
            if (path.endsWith('.vert')) {
                vShaders.push(data);
            } else if (path.endsWith('.frag')) {
                fShaders.push(data);
            }
        },
        async: false
    })
}

function downloadShaders(paths) {
    for (let i in paths) {
        downloadShader(paths[i]);
    }
}

function enableAttributes() {
    const numComponents = 3;
    const type = gl.FLOAT;
    const normalize = false;
    const stride = 0;
    const offset = 0;

    // Tell WebGL how to pull vertex positions from the vertex
    // buffer. These positions will be fed into the shader program's
    // "a_vertex" attribute.

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.vertex);
    gl.vertexAttribPointer(
        programInfo.locations.a_vertex,
        numComponents,
        type,
        normalize,
        stride,
        offset);
    gl.enableVertexAttribArray(
        programInfo.locations.a_vertex);


    // likewise connect the colors buffer to the "a_color" attribute
    // in the shader program
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);
    gl.vertexAttribPointer(
        programInfo.locations.a_color,
        numComponents,
        type,
        normalize,
        stride,
        offset);
    gl.enableVertexAttribArray(
        programInfo.locations.a_color);

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normal);
    gl.vertexAttribPointer(
        programInfo.locations.a_normal,
        numComponents,
        type,
        normalize,
        stride,
        offset);
    gl.enableVertexAttribArray(
        programInfo.locations.a_normal);

}

//
// Initialize a shader program, so WebGL knows how to draw our data
// BOILERPLATE CODE, COPY AND PASTE
function initShaderProgram(gl, vsSource, fsSource) {
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

    // Create the shader program

    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    // If creating the shader program failed, alert
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
        return null;
    }

    return shaderProgram;
}

//
// creates a shader of the given type, uploads the source and
// compiles it.  BOILERPLATE CODE, COPY AND PASTE
//
function loadShader(gl, type, source) {
    const shader = gl.createShader(type);

    // Send the source to the shader object
    gl.shaderSource(shader, source);

    // Compile the shader program
    gl.compileShader(shader);

    // See if it compiled successfully
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}

main();