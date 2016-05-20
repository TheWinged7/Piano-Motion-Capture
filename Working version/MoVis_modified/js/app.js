
//lab access	
//var ws = new WebSocket("ws://192.168.0.233:3000/relay");
//uws access
//var ws = new WebSocket("ws://137.154.151.239:3000/relay");
//home testing
var ws = new WebSocket("ws://127.0.0.1:3000/relay");

var scene;
var camera;
var renderer;
var controls;

//array of possible upper body label flags +NV
var TOP = ['Top_Head', 'FR_Head', 'BR_Head', 'FL_Head', 'BL_Head', 'R_Shoulder_Top', 'R_Shoulder_Back', 'R_Bicep', 'R_Elbow', 'R_Wrist_Upper', 'R_Wrist_Lower', 'R_Pinky', 'R_Thumb', 'L_Shoulder_Top', 'L_Shoulder_Back', 'L_Bicep', 'L_Elbow', 'L_Wrist_Upper', 'L_Wrist_Lower', 'L_Pinky', 'L_Thumb', 'Topspine', 'Sternum', 'Midback', 'Lowback_Center', 'Lowback_Right', 'Lowback_Left', 'Root']
//array of possible lower body label flags +NV
var BOTTOM = ['BRHip', 'BLHip', 'FRHip', 'FLHip', 'R_Troc', 'R_Thigh', 'R_Knee', 'R_Calf', 'R_Ankle', 'R_Foot_Lat', 'R_Toe_Lat', 'R_Toe_Med', 'L_Troc', 'L_Thigh', 'L_Knee', 'L_Calf', 'L_Ankle', 'L_Foot_Lat', 'L_Toe_Lat', 'L_Toe_Med'];

var SCALE = 0.05;
var trc = {};
var isPlaying = true;
var currentFrame = 0;
var startTime;
var previousTime;
var interval; //time between frames +NV
var dynObjs = []; //points +NV
var mkrParams;
var gui;
var trailLength = 50;

var gridHelper; //3D grid +NV
var isGridHelperVisible = true; //whether grid is visible +NV
var isPtcVisible = true;
var isLoading = false;

var flag = false;

var midiPoints =[];
var leapPoints =[];
var kinect1Points =[];
var kinect2Points =[];

var midiCloud ;
var leapCloud ;
var kinect1Cloud ;
var kinect2Cloud ;

var midiColour = 0xffffff;
var leapColour = 0xaaff80;
var kinect1Colour = 0xffffff;
var kinect2Colour = 0xff0000;//0xff66cc;

var midiOffset =  new Array(0,0,0);
var leapOffset =  new Array(0,0,0);
var kinect1Offset =  new Array(0,0,0);
var kinect2Offset =  new Array(0,0,0);

var midiScale =  0.05;
var leapScale =  0.05;
var kinect1Scale =  0.05;
var kinect2Scale =  0.05;

midiPoints[0] = new Array();
leapPoints[0] = new Array();
kinect1Points[0] = new Array();
kinect2Points[0] = new Array();

ws.onopen = function(evt)
               {
			    
               };


//most likely needs to be moved to server to load the file to be streamed (canned only) +NV
//file selection menu, if we add a button for live feed we should be able to keep mostly as is. +NV
function load_data_index(url, callback) { //take the trc.json file and a ??callback
    $.getJSON(url, function(data) { //get the .json file and open it. ??function(data)

        for (var folder in data) {
			//a bunch of HTML editing below
            var innerHeader = $(document.createElement('div'))
                .attr({id: folder, role: 'tab'})
                .addClass('panel-heading').append(
                $(document.createElement('h4'))
                    .addClass('panel-title').append(
                    $(document.createElement('a'))
                        .attr({ "data-toggle":"collapse",
                            "data-parent":"#accordion",
                            href:"#collapse"+folder,
                            "aria-expanded":true,
                            "aria-controls":"collapse"+folder
                        })
                        .html(folder)
                    )
                )

            var body = $(document.createElement('div'))
                .addClass("panel-body");

				//display all folders available as buttons, repeat with sub-folders/files on click
            for (var i=0; i<data[folder].length; i++) {
                var name = data[folder][i].name;
                var url = data[folder][i].url;
                var btn = $(document.createElement('button'))
                    .attr({ type:"button",
                            onclick:"open_trc('"+url+"')"})
                    .html(name);
                body.append(btn);
            }

			//able to hide/re-open file selection pane
            var bodyWrapper = $(document.createElement('div'))
                .attr({ id:"collapse"+folder,
                        role:"tabpanel",
                        "aria-labelledby":"heading"+folder
                })
                .addClass("panel-collapse")
                .addClass("collapse")
                .append(body)

            $("#trc-accordion").append(
                $(document.createElement('div'))
                .addClass("panel")
                .addClass("panel-default")
                .append(innerHeader))
                .append(bodyWrapper);

        }
        init();
    });
}


//should not have to touch this part either, all it does is set up the canvas +NV
function init() {

//set up for the 3D webGL renderer, does all the work for displaying the points for us +NV
    renderer = new THREE.WebGLRenderer(); 
    renderer.setClearColor( 0x212538 );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.1, 1000);
	
//adding event listener to look for resize operations
    window.addEventListener('resize', function() {
        var WIDTH = window.innerWidth, HEIGHT = window.innerHeight;
        renderer.setSize(WIDTH, HEIGHT);
        camera.aspect = WIDTH/HEIGHT;
        camera.updateProjectionMatrix();
    });
    camera.position.z = 120;

//toggle showing keyboard controls
    $('#shortcutModal').modal({
        keyboard: true,
        show: false
    })
    $('#loadModal').modal({
        keyboard: false
    })
}


//should not have to touch this part, all it does is set up the openGL scene +NV
function new_scene() {
	//if there is already a scene, clear it
    if (scene != undefined) {
        scene = {};
    }
	//make a new 3d scene and do required set up (lighting, controls, camera, grid, marker points, .etc)
    scene = new THREE.Scene();
    var ambient = new THREE.AmbientLight( 0x101030 );
    scene.add( ambient );

    var directionalLight = new THREE.DirectionalLight( 0xffeedd );
    directionalLight.position.set( 0, 0, 0.5 );
    scene.add( directionalLight );

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.damping = 0.2;

    gridHelper = new THREE.GridHelper(100, 10);
    scene.add(gridHelper);

    currentFrame = 0;
    dynObjs = [];
    mkrParams = [];
    isGridHelperVisible = true;
    isPtcVisible = true;
}

//initialisation of GUI, should not need touching either +NV
function initGui() {
    if (gui != undefined) {
        gui = {};
        $(".dg.ac").html('');
    }

    gui = new dat.GUI({autoPlace: true});

    mkrParams = {
        all:selectAll,
        none:selectNone,
        toggle:toggleSelection,
		midiBar:midiScale,
		leapBar:leapScale,
		kinect1Bar:kinect1Scale,
		kinect2Bar:kinect2Scale
    };
	/*
    for (var i=0; i<trc.data.groups.length; i++) {
        mkrParams[trc.data.groups[i]] = false;
    }*/
	
	
    gui.add(mkrParams, "all");
    gui.add(mkrParams, "none");
    gui.add(mkrParams, "toggle");

	/*
    for (var i=0; i<trc.data.groups.length; i++) {
        gui.add(mkrParams, trc.data.groups[i]).listen();
    }
	*/
	
	midiScaleBar = gui.add(mkrParams, "midiBar",0.05,0.2).name('Midi Scale').listen(); 
	leapScaleBar = gui.add(mkrParams, "leapBar",0.05,0.2).name('Leap Scale').listen(); 
	kinect1ScaleBar = gui.add(mkrParams, "kinect1Bar",0.05,0.2).name('Kinect 1 Scale').listen(); 
	kinect2ScaleBar = gui.add(mkrParams, "kinect2Bar",0.05,0.2).name('Kinect 2 Scale').listen(); 
	
	midiScaleBar.onChange(	function (newValue)	{	midiScale = newValue; ws.send(JSON.stringify("resend")); }	);	
	leapScaleBar.onChange(	function (newValue)	{	leapScale = newValue;	}	);	
	kinect1ScaleBar.onChange(	function (newValue)	{	kinect1Scale = newValue;	}	);	
	kinect2ScaleBar.onChange(	function (newValue)	{	kinect2Scale = newValue;	}	);	
	
    isLoading = false;
    animate();
}

//function to select all markers +NV
function selectAll() {
    for (var i=0; i<trc.data.groups.length; i++ ) {
        mkrParams[trc.data.groups[i]] = true;
    }
}

//function to select no markers +NV
function selectNone() {
    for (var i=0; i<trc.data.groups.length; i++ ) {
        mkrParams[trc.data.groups[i]] = false;
    }
}

//function to swap marker selection +NV
function toggleSelection() {
    for (var i=0; i<trc.data.groups.length; i++ ) {
        mkrParams[trc.data.groups[i]] = !mkrParams[trc.data.groups[i]];
    }
}


ws.onmessage = function (message) {
    var data = JSON.parse(message.data);
	//console.log(message.data);

	if (data[0]=="midi" || data[0]=="leap" || data[0]=="kin1" || data[0]=="kin2")
		{
		
		var vertSamples = []
		var vertices = [];
		switch (data[0])
			{
			case "midi":
				
				for (var j=1; j<data.length; j++) 
					{
					var vert = new THREE.Vector3(
					data[j][0] * midiScale,
					data[j][1] * midiScale,
					data[j][2] * midiScale);
					vertices.push(vert);
					}
				vertSamples.push(vertices);
				
			
				 if (midiPoints[0].length >vertSamples[0].length)
					{//replace only new points
						for (var i=0; i<vertSamples[0].length; i++)
							{
								innerLoop:
							for (var j=0; j<midiPoints[0].length; j++)
								
								{
									if (midiPoints[0][j].x == vertSamples[0][i].x)
									{
										midiPoints[0][j] = vertSamples[0][i]; //replace
										break innerLoop; 
										//j=midiPoints[0].length; //then set to end of midi points so as to not waste time comparing when we have already found
									}
								}
							}
					 
					}
				 else
					{
					midiPoints = [];
					midiPoints = vertSamples;
					}
	
					/*
				scene.remove(midiCloud);
				var geometry = new THREE.Geometry();
				geometry.vertices = midiPoints[0];
				var material = new THREE.PointCloudMaterial({size: 1, color:midiColour });
				midiCloud = new THREE.PointCloud( geometry, material );
				scene.add(midiCloud);
					*/
				break;
			 
			case "leap":
			
				for (var j=1; j<data.length; j++) 
					{
					var vert = new THREE.Vector3(
					data[j][0] * leapScale *-1,
					(data[j][1] * leapScale * -1) +400*leapScale,
					data[j][2] * leapScale);
					vertices.push(vert);
					}
				vertSamples.push(vertices);
				
				leapPoints = [];
				leapPoints = vertSamples;
				
				/*
				scene.remove(leapCloud);
				var geometry = new THREE.Geometry();
				geometry.vertices = leapPoints[0];
				var material = new THREE.PointCloudMaterial({size: 1, color:leapColour });
				leapCloud = new THREE.PointCloud( geometry, material );
				scene.add(leapCloud);
				*/
				break;
			 
			 case "kin1":
			 
				for (var j=1; j<data.length; j++) 
					{
					var vert = new THREE.Vector3(
					data[j][0] * midiScale,
					data[j][1] * midiScale,
					data[j][2] * midiScale);
					vertices.push(vert);
					}
				vertSamples.push(vertices);
				
				kinect1Points = [];
				kinect1Points = vertSamples;
				
				/*
				scene.remove(kinect1Cloud);
				var geometry = new THREE.Geometry();
				geometry.vertices = kinect1Points[0];
				var material = new THREE.PointCloudMaterial({size: 1, color:kinect1Colour });
				kinect1Cloud = new THREE.PointCloud( geometry, material );
				scene.add(kinect1Cloud);
				*/
				break;
			 
			 case "kin2":
			 
			 for (var j=1; j<data.length; j++) 
					{
					var vert = new THREE.Vector3(
					data[j][0] * midiScale,
					data[j][1] * midiScale,
					data[j][2] * midiScale);
					vertices.push(vert);
					}
				vertSamples.push(vertices);
			 
				kinect2Points = [];
				kinect2Points = vertSamples;
				
				/*
				scene.remove(kinect2Cloud);
				var geometry = new THREE.Geometry();
				geometry.vertices = kinect2Points[0];
				var material = new THREE.PointCloudMaterial({size: 1, color:kinect2Colour });
				kinect2Cloud = new THREE.PointCloud( geometry, material );
				scene.add(kinect2Cloud);
				*/
				break;
			}
			 
		
		}
		   //end if here or should it be after everything?
		   			
	}


function load_trc(url, callback) {
    console.log("Reading ", url);
    $("#loadingText").html(url);
    $("#loadingModal").modal({
        keyboard: false,
        show: true
    })
    if (trc!=undefined) {
        trc = {};
    }
    $.ajax({
        url: url,
        dataType: 'json',
        method: 'GET',
        progress:  function(e) {
        //make sure we can compute the length
            if(e.lengthComputable) {
                //calculate the percentage loaded
                var pct = Math.floor((e.loaded / e.total) * 100);
                $("#loadingProgress").attr({"aria-valuenow":pct});
                $("#loadingProgress").css("width",pct+"%");
                $("#loadingProgress").html(pct+"%");
            }
            //this usually happens when Content-Length isn't set
            else {
                $("#loadingProgress").attr({"aria-valuenow":100});
                $("#loadingProgress").addClass("active progress-bar-striped");
                $("#loadingProgress").css("width","100%");
                $("#loadingProgress").html("Please be patient...");
                console.warn('Content Length not reported!');
            }
        },
        success: function(trcData) {
            trcData.vertSamples = []
            for (var i=0; i<trcData.samples.length; i++) {
                var sample = trcData.samples[i].samples;
                var vertices = []
                for (var j=0; j<sample.length; j=j+3) {
                    var vert = new THREE.Vector3(
                        sample[j]   * SCALE,
                        sample[j+1] * SCALE,
                        sample[j+2] * SCALE);
                    vertices.push(vert);
                }
                trcData.vertSamples.push(vertices);
            }
            trc.data = trcData;
            var geometry = new THREE.Geometry();
            geometry.vertices = trc.data.vertSamples[currentFrame];
            var material = new THREE.PointCloudMaterial({size: 1});
            trc.ptc = new THREE.PointCloud( geometry, material );
            scene.add(trc.ptc);

            interval = (1000.0 / trc.data.DataRate);
            startTime = Date.now();
            previousTime = Date.now();
            $('#loadingModal').modal('hide');
            callback();
        } 
    });
}

function open_trc(url) {
    isLoading = true;
    // clean scene
    $('#loadModal').modal('hide');
    new_scene();
    load_trc(url, initGui);
}


//playback part, may rip some of this out and move it to the server +NV
function animate() {
    if (isLoading) return; // if is still loading, do nothing 
    var currentTime=Date.now(); //set date/time
	//if is not paused
    if (isPlaying) {
		
				scene.remove(leapCloud);
				var geometry = new THREE.Geometry();
				geometry.vertices = leapPoints[0];
				var material = new THREE.PointCloudMaterial({size: 1, color:leapColour });
				leapCloud = new THREE.PointCloud( geometry, material );
				scene.add(leapCloud);				
				
				scene.remove(midiCloud);
				var geometry = new THREE.Geometry();
				geometry.vertices = midiPoints[0];
				var material = new THREE.PointCloudMaterial({size: 1, color:midiColour });
				midiCloud = new THREE.PointCloud( geometry, material );
				scene.add(midiCloud);
				
				scene.remove(kinect1Cloud);
				var geometry = new THREE.Geometry();
				geometry.vertices = kinect1Points[0];
				var material = new THREE.PointCloudMaterial({size: 1, color:kinect1Colour });
				kinect1Cloud = new THREE.PointCloud( geometry, material );
				scene.add(kinect1Cloud);
				
				scene.remove(kinect2Cloud);
				var geometry = new THREE.Geometry();
				geometry.vertices = kinect2Points[0];
				var material = new THREE.PointCloudMaterial({size: 1, color:kinect2Colour });
				kinect2Cloud = new THREE.PointCloud( geometry, material );
				scene.add(kinect2Cloud);
		
        var frameNumber = Math.floor(((currentTime - startTime)/interval) % trc.data.NumFrames); //grab current frame number
        if (currentFrame != frameNumber) { //if current frame does not match selected frame
            currentFrame = frameNumber; //set current frame to match selected frame
            trc.ptc.geometry.vertices = trc.data.vertSamples[currentFrame];
            trc.ptc.geometry.verticesNeedUpdate = true;
            //
            for (var i=0; i<dynObjs.length; i++) {
                dynObjs[i].updateFunc(dynObjs[i]); //move all marker points to current frame
            }
        }

    } else { // if it does match, get current marker point locations 
        trc.ptc.geometry.vertices = trc.data.vertSamples[currentFrame];
        trc.ptc.geometry.verticesNeedUpdate = true;
        for (var i=0; i<dynObjs.length; i++) {
            dynObjs[i].updateFunc(dynObjs[i]); //display current marker points locations
        }
    }
	
			
    requestAnimationFrame(animate); //request next frame
    render(); //draw current frame to screen
	
}

function render() {
    renderer.render(scene, camera);
    controls.update();
}

//keyboard IO, should not need to be touched +NV
var keyPressed = function(event) {
    console.log(event);
    switch (event.keyCode) {
        case 32: // space - stop and start playback
            isPlaying = !isPlaying;
            break;
        case 65: // a - creates a curve that spans through the selected points over the duration of the clip
            create_mkr_path();
            break;
        case 66: // b - creates brush strokes along the ground, following the selected markers
            create_speed_circles();
            break;
        case 67: // c - creates a spline curve between the selected markers that travels with them
            create_mkr_curve();
            break;
        case 71: // g - toggles the grid visibility
            if (isGridHelperVisible) {
                scene.remove(gridHelper)
            } else {
                scene.add(gridHelper);
            }
            isGridHelperVisible = !isGridHelperVisible;
            break;
        case 75: // k - show keyboard shortcuts
            $('#shortcutModal').modal('show');
            break;
        case 77: // m - toggles the marker visibility
            if (isPtcVisible) {
                scene.remove(trc.ptc)
            } else {
                scene.add(trc.ptc);
            }
            isPtcVisible = !isPtcVisible;
            break;
        case 79: // o - open load dialog
            $('#loadModal').modal('show');
            break;
        case 83: // s - toggle selection menu visibility
            if (gui.closed) { gui.open(); } else { gui.close(); }
            break;
        case 84: // t - create motion trails
            create_speed_spheres();
            break;
        case 85: // u - create "up" arrows
            create_vertical_arrows();
            break;
        case 86: // v - create velocity vector arrows
            create_velocity_arrows();
            break;
        case 88: // x - step one frame forward in time
            if (!isPlaying) {
                currentFrame += 1;
            }
            break;
        case 90: // z - step one frame back in time
            if (!isPlaying) {
                currentFrame -= 1;
            }
            break;
        case 192: // ` - remove all lines
            // `
            for(var i=scene.children.length-1; i>=0; i--) {
                if (scene.children[i].type === "Line" || scene.children[i].type === "ArrowHelper") {
                    scene.remove(scene.children[i]);
                }
            }
            break;
    }
}
document.addEventListener("keydown", keyPressed, false);

//return selected marker(s index(/indices in array)
function get_selected_marker_indices() {
    var indices = [];
    for (var i=0; i<trc.data.groups.length; i++) {
        var name = trc.data.groups[i];
        if ( mkrParams[name]) {
            var mkrIndex = trc.data.groups.indexOf(name);
            indices.push(mkrIndex);
        }
    }
    return indices;
}

//create new marker from data.
function create_mkr_path() {
    var indices = get_selected_marker_indices();
    console.log(indices);
    for (var i=0; i<indices.length; ++i){
        var mkrIndex = indices[i];
        var mkrName = trc.data.groups[mkrIndex];
        var points = [];
        for (var j=0; j<trc.data.vertSamples.length; j++) {
            points.push(trc.data.vertSamples[j][mkrIndex]);
        }
        var geometry = new THREE.Geometry();
        var curve = new THREE.SplineCurve3( points );
        geometry.vertices = curve.getPoints( points.length );
        var color;
        if (mkrName.lastIndexOf("L_") === 0) {
            color = 0xE0E7AB;
        } else if (mkrName.lastIndexOf("R_") === 0) {
            color = 0xA2CFA5;
        } else {
            color = 0xF5974E;
        }
        var material = new THREE.LineBasicMaterial( { color : color } );
        var splineObject = new THREE.Line( geometry, material );
        scene.add(splineObject);
    }
}

function create_mkr_curve() {

    var indices = get_selected_marker_indices();
    var points = [];
    var follow = true;

    for (var i=0; i<indices.length; i++) {
        var mkrIndex = indices[i];
        points.push(trc.data.vertSamples[currentFrame][mkrIndex]);
    }
    var geometry = new THREE.Geometry();
    var curve = new THREE.SplineCurve3( points );
    geometry.vertices = curve.getPoints( indices.length*10 );
    var material = new THREE.LineBasicMaterial( { color : 0xffffff } );
    var splineObject = new THREE.Line( geometry, material );
    scene.add(splineObject);
    if (follow) {
        dynObjs.push({
            obj: splineObject,
            indices: indices,
            resolution: indices.length*20,
            isFollowing: follow,
            updateFunc: update_curve
        });
    }
}

function update_curve(splineObject) {
    if (!(splineObject.isFollowing)) {
        return;
    }
    var points = [];
    for (var i=0; i<splineObject.indices.length; i++) {
        points.push(trc.data.vertSamples[currentFrame][splineObject.indices[i]]);
    }
    var curve = new THREE.SplineCurve3( points );
    splineObject.obj.geometry.vertices = curve.getPoints( splineObject.resolution );
    splineObject.obj.geometry.verticesNeedUpdate = true;
}

function create_vertical_arrows() {
    var indices = get_selected_marker_indices();
    for (var i=0; i<indices.length; i++) {

        var origin = new THREE.Vector3( 0, 0, 0 );
        origin.copy(trc.data.vertSamples[currentFrame][indices[i]]);

        var mkrName = trc.data.groups[indices[i]];
        var dir, hex, length, up;
        if (TOP.indexOf(mkrName) != -1) {
            dir = new THREE.Vector3( 0, 1, 0 );
            hex = 0xD24344;
            length = 100-origin.y;
            up = true;
        } else {
            dir = new THREE.Vector3( 0, -1, 0 );
            hex = 0xA2CFA5;
            length = 10; //origin.y;
            up = false;
        }

        var arrowHelper = new THREE.ArrowHelper( dir, origin, length, hex );
        scene.add( arrowHelper );
        dynObjs.push({
            obj: arrowHelper,
            index: indices[i],
            updateFunc: update_vertical_arrow,
            up: up
        });
    }
}

function update_vertical_arrow(arrowObj) {
    arrowObj.obj.position.copy(trc.data.vertSamples[currentFrame][arrowObj.index]);
    if (arrowObj.up) {
        arrowObj.obj.setLength(100-arrowObj.obj.position.y, 1,10);
    } else {
        arrowObj.obj.setLength(arrowObj.obj.position.y, 1,10);
    }

}

function create_velocity_arrows() {
    var indices = get_selected_marker_indices();
    for (var i=0; i<indices.length; i++) {

        var velocity = calc_velocity(indices[i], 30);
        var length = velocity.length();
        var dir = velocity.normalize();
        var origin = new THREE.Vector3( 0, 0, 0 );
        origin.copy(trc.data.vertSamples[currentFrame][indices[i]]);

        var hex = 0xE96B56;

        var arrowHelper = new THREE.ArrowHelper( dir, origin, length, hex );
        scene.add( arrowHelper );
        dynObjs.push({
            obj: arrowHelper,
            index: indices[i],
            updateFunc: update_velocity_arrow
        });
    }
}

function update_velocity_arrow(arrowObj) {
    var velocity = calc_velocity(arrowObj.index, 10);
    arrowObj.obj.setLength(velocity.length()*0.3, velocity.length()*0.2, velocity.length()*0.1);
    var v = velocity.length();
    arrowObj.obj.setDirection(velocity.normalize());
    arrowObj.obj.position.copy(trc.data.vertSamples[currentFrame][arrowObj.index]);

    var col = new THREE.Color();
    col.setHex(0xE96B56);
    col.offsetHSL(0.0,0.0,v*0.0005);

    arrowObj.obj.setColor(col.getHex());
}

var maxSpeeds = {}
function create_speed_circles() {
    var indices = get_selected_marker_indices();
    for (var i=0; i<indices.length; i++) {
        var index = indices[i];
        var maxSpeed = calc_max_speed(index)
        maxSpeeds[index] = maxSpeed;
        dynObjs.push({
            obj: null,
            index: index,
            updateFunc: update_speed_circles,
            maxSpeed: maxSpeed,
            children: []
        });
    }
}

function update_speed_circles(obj) {
    if (currentFrame === 0) { return; }

    var speed = calc_speed(obj.index) / obj.maxSpeed;
    var radius = 1.0;
    var circle;
    var scaleFactor = speed*8;

    if (obj.children.length > trailLength ) {
        circle = obj.children.shift();
        circle.material.opacity = 1.0;
    } else {
        var segments = 8;
        var circleGeometry = new THREE.CircleGeometry( radius, segments );
        var material = new THREE.MeshBasicMaterial({
            color: 0xA2CFA5,
            transparent: true
        });
        circle = new THREE.Mesh( circleGeometry, material );
        console.log("New circle");
        circle.matrixAutoUpdate = false;
        circle.rotateOnAxis (new THREE.Vector3( 1, 0, 0 ), degToRad(-90.0));
        scene.add( circle );
    }
    circle.position.copy(trc.data.vertSamples[currentFrame][obj.index]);
    circle.position.setY(0.0);
    circle.scale.copy(new THREE.Vector3(scaleFactor, scaleFactor, 1.0 ));
    circle.updateMatrix();
    for (var i=0; i<obj.children.length; i++) {
        obj.children[i].material.opacity *= 0.95;
    }
    obj.children.push(circle);
}

function create_speed_spheres() {
    var indices = get_selected_marker_indices();
    for (var i=0; i<indices.length; i++) {
        var index = indices[i];
        var maxSpeed = calc_max_speed(index)
        maxSpeeds[index] = maxSpeed;
        dynObjs.push({
            obj: null,
            index: index,
            updateFunc: update_speed_spheres,
            maxSpeed: maxSpeed,
            children: []
        });
    }
}

function update_speed_spheres(obj) {
    if (currentFrame === 0) { return; }
    var speed = calc_speed(obj.index) / obj.maxSpeed;
    var radius = speed*5;
    var segments = 6;
    var sphere;

    if (obj.children.length > trailLength ) {
        sphere = obj.children.shift();
        sphere.material.opacity = 1.0;
    } else {
        var geometry = new THREE.SphereGeometry(1.0, segments, segments);
        var material = new THREE.MeshBasicMaterial({
            color: 0xD24344,
            transparent: true
        });
        sphere = new THREE.Mesh(geometry, material);
        scene.add(sphere);
    }
    sphere.position.copy(trc.data.vertSamples[currentFrame][obj.index]);
    sphere.scale.copy(new THREE.Vector3(radius, radius, radius ));
    sphere.updateMatrix();
    for (var i=0; i<obj.children.length; i++) {
        obj.children[i].material.opacity *= 0.95;
    }
    obj.children.push(sphere);
}

function calc_velocity(index, tDelta) {
    // tDelta in samples | 120 = 1 second
    var points = []
    for (var i=0; i<tDelta; i++) {
        if (currentFrame+i < trc.data.NumFrames) {
            points.push(trc.data.vertSamples[currentFrame+i][index]);
        }
    }
    var curve = new THREE.SplineCurve3( points );
    var length = curve.getLength();

    var speed = length/ (tDelta / trc.data.DataRate);

    // get normalized vector
    var velocity =  new THREE.Vector3();
    velocity.subVectors(curve.getPoint(1),curve.getPoint(0));
    velocity.normalize();

    velocity.multiplyScalar(speed);

    return velocity;
}

function calc_speed(index) {
    if (currentFrame===0) {
        return 0;
    }
    var t1 = trc.data.vertSamples[currentFrame-1][index];
    var t2 = trc.data.vertSamples[currentFrame][index];
    var len = new THREE.Vector3()
    len.subVectors(t2, t1);
    return len.length();
}

function calc_max_speed(index) {
    var maxLength = 0.0;
    for (var i=1; i<trc.data.NumFrames; i++) {
        var t1 = trc.data.vertSamples[i-1][index];
        var t2 = trc.data.vertSamples[i][index];
        var len = new THREE.Vector3()
        len.subVectors(t2, t1);
        if (len.length() > maxLength) {
            maxLength = len.length();
        }
    }
    return maxLength;
}

var degToRad = function(val) {
    return val*Math.PI/180.0;
}

load_data_index("data/trc.json", init);
//init();
