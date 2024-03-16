import * as THREE from 'three';
import * as SPLAT from 'gsplat';
import { ARButton } from 'three/examples/jsm/webxr/ARButton';

let basePath;

if (window.location.hostname === "localhost") {  
  basePath = "./ARHittest/public/"; 
} else {
  basePath = "./"; // Pfad für Server
}

const scale = 1
const movement_scale = 5
const initial_z = 0

let trenderer, xrRefSpace, tscene, tcamera;
const renderer = new SPLAT.WebGLRenderer();
renderer.backgroundColor = new SPLAT.Color32(0, 0, 0, 0);
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new SPLAT.Scene();
scene.position = new SPLAT.Vector3(100, 0, 0);
const camera = new SPLAT.Camera();
camera._position = new SPLAT.Vector3(0, 0, 0);
camera._rotation = new SPLAT.Quaternion();
camera.data.fx =  2232 / 4;
camera.data.fy =  2232 / 4;
camera.data.near =  0.03;
camera.data.far =  100;


let container;
let controller;

let reticle;

let hitTestSource = null;
let hitTestSourceRequested = false;

let objectPlaced = false;

init();
animate();

function init() {

	container = document.createElement( 'div' );
	document.body.appendChild( container );

	tscene = new THREE.Scene();

	tcamera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.01, 20 );

	const light = new THREE.HemisphereLight( 0xffffff, 0xbbbbff, 3 );
	light.position.set( 0.5, 1, 0.25 );
	tscene.add( light );

	//

	trenderer = new THREE.WebGLRenderer( { antialias: true, alpha: true } );
	trenderer.setPixelRatio( window.devicePixelRatio );
	trenderer.setSize( window.innerWidth, window.innerHeight );
	trenderer.xr.enabled = true;
	container.appendChild( trenderer.domElement );

    trenderer.xr.addEventListener('sessionstart', function(ev) {
        console.log('sessionstart', ev);
    });
    trenderer.xr.addEventListener('sessionend', function(ev) {
        console.log('sessionend', ev);
    });
	//

	document.body.appendChild( ARButton.createButton( trenderer, { requiredFeatures: [ 'hit-test' ] } ) );

	//

	const geometry = new THREE.CylinderGeometry( 0.1, 0.1, 0.2, 32 ).translate( 0, 0.1, 0 );

	async function onSelect() {

		if ( reticle.visible ) {

			const url = `${basePath}splats/yona/yona_7000.splat`;
            const splat = await SPLAT.Loader.LoadAsync(url, scene, (progress) => (console.log(Math.round(progress * 100))));
            
            // Transform it  
            const rotation = new SPLAT.Vector3(0, 0, 0);
            const translation = new SPLAT.Vector3(-0.2, 0.2, 5);
            const scaling = new SPLAT.Vector3(1.5, 1.5, 1.5);
            splat.rotation = SPLAT.Quaternion.FromEuler(rotation);
            splat.position = translation;
            splat.scale = scaling;
            splat.applyPosition();
            splat.applyRotation();
            splat.applyScale();

            objectPlaced = true;
            const frame = () => {
                renderer.render(scene, camera);
                requestAnimationFrame(frame);
              };
            
            requestAnimationFrame(frame);
		}

	}

	controller = trenderer.xr.getController( 0 );
	controller.addEventListener( 'select', onSelect );
	tscene.add( controller );

	var loader = new THREE.TextureLoader();

	loader.load(
		`${basePath}assets/marker.png`, 
		function( texture ) {
			var material = new THREE.MeshBasicMaterial({ map: texture });
			var geometry = new THREE.PlaneGeometry(0.3, 0.3).rotateX( - Math.PI / 2 );

			reticle = new THREE.Mesh( geometry, material );		
			reticle.matrixAutoUpdate = false;
			reticle.visible = false;
			tscene.add( reticle );
		},
		undefined,
		function(error) {
			console.log("An error loading the marker occurred: " + error);
			reticle = new THREE.Mesh(
				new THREE.RingGeometry( 0.15, 0.2, 32 ).rotateX( - Math.PI / 2 ),
				new THREE.MeshBasicMaterial()
			);
			reticle.matrixAutoUpdate = false;
			reticle.visible = false;
			tscene.add( reticle );
		}
	);		

	//

	window.addEventListener( 'resize', onWindowResize );

}

function onWindowResize() {

	tcamera.aspect = window.innerWidth / window.innerHeight;
	tcamera.updateProjectionMatrix();

	trenderer.setSize( window.innerWidth, window.innerHeight );

}

//

function animate() {

	trenderer.setAnimationLoop( render );

}

function render( timestamp, frame ) {

	if ( frame ) {

		const referenceSpace = trenderer.xr.getReferenceSpace();
		const session = trenderer.xr.getSession();

        session.requestReferenceSpace('local').then((refSpace) => {
            xrRefSpace = refSpace;
            session.requestAnimationFrame(onXRFrame);
        });

		if ( hitTestSourceRequested === false ) {

			session.requestReferenceSpace( 'viewer' ).then( function ( referenceSpace ) {                

				session.requestHitTestSource( { space: referenceSpace } ).then( function ( source ) {

					hitTestSource = source;

				} );

			} );

			session.addEventListener( 'end', function () {

				hitTestSourceRequested = false;
				hitTestSource = null;

			} );

			hitTestSourceRequested = true;

		}

		if ( hitTestSource ) {

			const hitTestResults = frame.getHitTestResults( hitTestSource );

			if ( hitTestResults.length ) {

				const hit = hitTestResults[ 0 ];

				reticle.visible = true;
				reticle.matrix.fromArray( hit.getPose( referenceSpace ).transform.matrix );

			} else {

				reticle.visible = false;

			}

		}

	}

	trenderer.render( tscene, tcamera );

}

function onXRFrame(t, frame) {
    if(objectPlaced) {
        const session = frame.session;
        session.requestAnimationFrame(onXRFrame);
        const baseLayer = session.renderState.baseLayer;
        const pose = frame.getViewerPose(xrRefSpace);
    
        trenderer.render( tscene, tcamera );  
        camera._position.x = scale*movement_scale*tcamera.position.x;
        camera._position.y = -scale*movement_scale*tcamera.position.y-1;
        camera._position.z = -scale*movement_scale*tcamera.position.z-initial_z;
        camera._rotation.x = tcamera.quaternion.x;
        camera._rotation.y = -tcamera.quaternion.y;
        camera._rotation.z = -tcamera.quaternion.z;
        camera._rotation.w = tcamera.quaternion.w;
    }    
  }