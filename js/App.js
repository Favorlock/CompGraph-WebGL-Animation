import Engine from './engine/core/Engine.js';

let engine;
let canvas;
let gl;
let matrix = new Learn_webgl_matrix();

let angle_x = 0;
let angle_y = 0;
let trans_x = 0;
let trans_y = 0;
let trans_z = 0;
let timeMultiplier = 1;

let vShaders = [];
let fShaders = [];
let shaderProgram;
let programInfo;

let gears = [];

let initialized = false;
let cameraDefaults = [0, 0, 0];
let camera = cameraDefaults.slice(0);

let centerX = 0;
let centerY = 0;
let centerZ = 0;
let upDX = 0;
let upDY = 1;
let upDZ = 0;

let lookAhead = {
    mode: 'look-forward',
    amount: 1
}

let paths = [
    {
        controlPoints: [
            [7, 0.4, 3],
            [4, -0.1, 0],
            [3, -0.1, -1.2],
            [-2, -.6, -0.5]
        ],
        center: lookAhead,
        ticks: 6 * 60
    },
    {
        controlPoints: [
            [-2, 5, -4],
            [0, 3, -2],
            [1, 1, 0],
            [0, -2, 0]
        ],
        center: {
            mode: 'point',
            point: [0, 0.9, -1.2]
        },
        ticks: 7 * 60
    }
]
let currentPath = 0;
let currentTick = 0;
let animationLength = 0;

for (let prop in paths) {
    animationLength += paths[prop].ticks;
}

function resetLookAt() {
    resetCamera();
    resetCenter();
}

function resetCamera() {
    camera[0] = cameraDefaults[0];
    camera[1] = cameraDefaults[1];
    camera[2] = cameraDefaults[2];
}

function resetCenter() {
    centerX = 0;
    centerY = 0;
    centerZ = 0;
}

function weight(tick) {
    let t = tick;

    return [
        Math.pow(1 - t, 3),
        3 * Math.pow(1 - t, 2) * t,
        3 * (1 - t) * Math.pow(t, 2),
        Math.pow(t, 3)
    ]
}


function update(delta, ticks) {
    if (currentTick == paths[currentPath].ticks) {
        if (paths.length - 1 > currentPath) {
            currentPath += 1;
        } else {
            currentPath = 0;
        }

        currentTick = 0;
    }

    resetLookAt();

    let path = paths[currentPath];
    let weights = weight(currentTick / path.ticks);
    let controlPoints = path.controlPoints;

    for (let i = 0; i < controlPoints.length; i++) {
        camera[0] += weights[i] * controlPoints[i][0];
        camera[1] += weights[i] * controlPoints[i][1];
        camera[2] += weights[i] * controlPoints[i][2];

        let center = path.center;

        if (path.center.mode === 'look-forward') {
            let weights2 = weight(Math.min(currentTick + path.center.amount, path.ticks) / path.ticks);

            centerX += weights2[i] * controlPoints[i][0];
            centerY += weights2[i] * controlPoints[i][1];
            centerZ += weights2[i] * controlPoints[i][2];
        } else if (center.mode === 'point') {
            let point = center.point;

            centerX = point[0];
            centerY = point[1];
            centerZ = point[2];
        }
    }

    if (engine.tickHandler.steps % animationLength == 0) {
        currentTick = 1;
        currentPath = 0;
        loadScene();
    } else {
        currentTick++;
    }
}

function loadScene() {
    // clear gears
    gears.length = 0;

    // build the object(s) we'll be drawing, put the data in buffers
    gears.push(createGear(2,
        createTransform(),
        [0, 0, .3]));

    gears.push(createGear(4,
        createTransform(1.875, 0, 0),
        [0, 0, -.3]));

    gears.push(createGear(6,
        createTransform(1.875, -.875, .5, 90, 0, 0, 0.5, 0.5, 0.5),
        [0, 0, -.45225]));

    gears.push(createGear(11,
        createTransform(-.9, -.3, -1.2, 0, 90, 0, 1.25, 1.25, 1.25),
        [0, 0, .225]));

    gears.push(createGear(23,
        createTransform(0, 0.9, -1.2, 90, 0, 0, 1, 1, 1),
        [0, 0, -.3]));

    gears.push(createGear(21,
        createTransform(.9, -.3, -1.3, 0, 90, 0, 1.25, 1.25, 1.25),
        [0, 0, -.225]));
}

function createIdentityMatrix() {
    let mat = matrix.create();
    matrix.setIdentity(mat);
    return mat;
}

function createTranslateMatrix(x, y, z) {
    let mat = createIdentityMatrix();
    matrix.translate(mat, x, y, z);
    return mat;
}

function createRotateMatrix(angleX, angleY, angleZ) {
    let xRotate = matrix.create();
    let yRotate = matrix.create();
    let zRotate = matrix.create();

    matrix.rotate(xRotate, angleX, 1, 0, 0);
    matrix.rotate(yRotate, angleY, 0, 1, 0);
    matrix.rotate(zRotate, angleZ, 0, 0, 1);

    matrix.multiplySeries(xRotate, xRotate, yRotate, zRotate);

    return xRotate;
}

function createScaleMatrix(sx, sy, sz) {
    let mat = createIdentityMatrix();
    matrix.scale(mat, sx, sy, sz);
    return mat;
}

function createTransform(x = 0, y = 0, z = 0, angleX = 0, angleY = 0, angleZ = 0, sx = 1, sy = 1, sz = 1) {
    let transform = {
        translate: createTranslateMatrix(x, y, z),
        rotate: createRotateMatrix(angleX, angleY, angleZ),
        scale: createScaleMatrix(sx, sy, sz)
    };

    return transform;
}

function createGear(id, transform = createTransform(), rotation = [0, 0, 0]) {
    return {
        buffer: initBuffers(id),
        transform: transform,
        rotation: rotation
    }
}

function drawGear(gear, projection, lookAt, g_xRotate, g_yRotate, g_scale) {
    bindBuffers(gear);

    let o_pvmTransform = matrix.create();
    let o_vmTransform = matrix.create();

    let rotation = gear.rotation;
    let rotate = createRotateMatrix(timeMultiplier * rotation[0], timeMultiplier * rotation[1], timeMultiplier * rotation[2]);

    let transform = gear.transform;
    matrix.multiplySeries(transform.rotate, transform.rotate, rotate);

    matrix.multiplySeries(o_pvmTransform, projection, lookAt, g_xRotate, g_yRotate, transform.translate, transform.rotate, g_scale, transform.scale);
    matrix.multiplySeries(o_vmTransform, lookAt, g_xRotate, g_yRotate, transform.translate, transform.rotate, g_scale, transform.scale);

    // gl.uniformMatrix4fv(programInfo.locations.u_PVM_transform, false, pvmTransform);
    gl.uniformMatrix4fv(programInfo.locations.u_PVM_transform, false, o_pvmTransform);
    // Set the shader program's uniform
    gl.uniformMatrix4fv(programInfo.locations.u_VM_transform, false, o_vmTransform);

    { // now tell the shader (GPU program) to draw some triangles
        const offset = 0;
        gl.drawArrays(gl.TRIANGLES, offset, gear.buffer.num_vertices);
    }
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

    let lookAt = matrix.create();

    matrix.lookAt(lookAt,
        camera[0], camera[1], camera[2],
        centerX, centerY, centerZ,
        upDX, upDY, upDZ);

    let projection = matrix.createFrustum(-.01, .01, -.01, .01, .03, 1000);
    let xRotate = matrix.create();
    let yRotate = matrix.create();
    let scale = matrix.create();

    matrix.scale(scale, 0.8, 0.8, 0.8);
    matrix.rotate(xRotate, angle_x, 1, 0, 0);
    matrix.rotate(yRotate, angle_y, 0, 1, 0);

    gl.uniform3f(programInfo.locations.u_light_dir, 1, 1, 1);

    gl.uniform3f(programInfo.locations.u_light_color, 1.0, 1.0, 1.0);
    gl.uniform1f(programInfo.locations.u_shininess, 85);
    gl.uniform3f(programInfo.locations.u_ambient_color, 0.2, 0.2, 0.2);

    for (let i in gears) {
        let gear = gears[i];

        drawGear(gear, projection, lookAt, xRotate, yRotate, scale);
    }
}

function init() {
    // If we don't have a GL context, give up now
    if (!gl) {
        alert('Unable to initialize WebGL. Your browser or machine may not support it.');
        return;
    }

    downloadShaders([
        './shaders/Global.vert',
        './shaders/Global.frag'
    ]);

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
    document.addEventListener('keydown', function (event) {
        switch (event.key) {
            case "ArrowLeft":
                angle_y -= 3;
                break;
            case "ArrowUp":
                angle_x -= 3;
                break;
            case "ArrowRight":
                angle_y += 3;
                break;
            case "ArrowDown":
                angle_x += 3;
                break;
            case "a":
                camera[0] -= .2;
                break;
            case "w":
                camera[1] += .2
                break;
            case "d":
                camera[0] += .2;
                break;
            case "s":
                camera[1] -= .2;
                break;
            case "PageUp":
                camera[2] -= .2;
                break;
            case "PageDown":
                camera[2] += .2;
                break;
            case "=":
                timeMultiplier = Math.min(4, timeMultiplier + 0.2);
                break;
            case "-":
                timeMultiplier = Math.max(-4, timeMultiplier - 0.2);
                break;
            default:
                break;
        }

        draw();
    });

    initialized = true;
}

function loop(delta, ticks) {
    update(delta, ticks);
    draw();
}

//
// initBuffers
//
// Initialize the buffers we'll need. For this demo, we just
// have one object -- a simple two-dimensional square.
//
function initBuffers(gear_id) {
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

function bindBuffers(gear) {
    let buffer = gear.buffer;

    const numComponents = 3;
    const type = gl.FLOAT;
    const normalize = false;
    const stride = 0;
    const offset = 0;

    // Tell WebGL how to pull vertex positions from the vertex
    // buffer. These positions will be fed into the shader program's
    // "a_vertex" attribute.

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer.vertex);
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
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer.color);
    gl.vertexAttribPointer(
        programInfo.locations.a_color,
        numComponents,
        type,
        normalize,
        stride,
        offset);
    gl.enableVertexAttribArray(
        programInfo.locations.a_color);

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer.normal);
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

window.onload = function () {
    engine = new Engine(loop);
    engine.init();

    canvas = engine.canvas;
    gl = engine.ctx;

    init();

    if (!initialized) return;

    loadScene();

    engine.start();
};