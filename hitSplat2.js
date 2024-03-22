import * as SPLAT from 'gsplat';
import * as THREE from 'three';

const scale = 1
const movement_scale = 2.5
const initial_z = 0
const initial_y = 0 //-15

// check path for local or github pages
let basePath;

// Überprüfe den Hostnamen
if (window.location.hostname === "localhost") {  
    basePath = "./ARHittest/public/"; 
} else {
    basePath = "./"; // Pfad für Server
}

let container;
let trenderer, xrRefSpace, tscene, tcamera;
let controller;

let reticle;

let hitTestSource = null;
let hitTestSourceRequested = false;
let searchforhit = true;

const renderer = new SPLAT.WebGLRenderer();
renderer.backgroundColor = new SPLAT.Color32(0, 0, 0, 0);
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new SPLAT.Scene();
scene.position = new SPLAT.Vector3(0, 0, 0);
const camera = new SPLAT.Camera();
camera._position = new SPLAT.Vector3(0, 0, 0);
camera._rotation = new SPLAT.Quaternion();
camera.data.fx =  2232 / 4;
camera.data.fy =  2232 / 4;
camera.data.near =  0.03;
camera.data.far =  100;

let splat;

init();

function onWindowResize() 
{
    tcamera.aspect = window.innerWidth / window.innerHeight;
	tcamera.updateProjectionMatrix();

    trenderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener("resize", onWindowResize);

var button = document.createElement( 'button' );
button.id = 'ArButton';
button.textContent = 'ENTER AR';
button.style.cssText += `position: absolute;top:80%;left:40%;width:20%;height:2rem;`;

document.body.appendChild( button );
button.addEventListener( 'click',x=>AR() )

main();

async function main() 
{  
    const url = `${basePath}splats/yona/yona_7000.splat`;
    splat = await SPLAT.Loader.LoadAsync(url, scene, (progress) => (updateLoadingProgress(Math.round(progress * 100))));       
}

function init() {
    container = document.createElement( 'div' );
     document.body.appendChild( container );

    tscene = new THREE.Scene();
    tcamera = new THREE.PerspectiveCamera(80, window.innerWidth / window.innerHeight, 0.01, 50 );

    trenderer = new THREE.WebGLRenderer( {antialias: true, alpha: true });
    trenderer.setPixelRatio( window.devicePixelRatio );
    trenderer.setSize( window.innerWidth, window.innerHeight );
    trenderer.xr.enabled = true;
    container.appendChild( trenderer.domElement );

    function onSelect() {        
        // Transform it          
        const position = new THREE.Vector3();
        const quaternion = new THREE.Quaternion();
        const scale = new THREE.Vector3();
        reticle.matrix.decompose(position, quaternion, scale);

        splat.scale = new SPLAT.Vector3(2, 2, 2);
        splat.position = new SPLAT.Vector3(position.x, position.y-initial_y, position.z);
        console.log(splat.rotation);
        splat.applyPosition();
        splat.applyScale();
        
        searchforhit = false;
        reticle.visible = false;
        controller.removeEventListener( 'select', onSelect );

        const frame = () => {
            renderer.render(scene, camera);
            requestAnimationFrame(frame);
        };
    
        requestAnimationFrame(frame);

        // Extrahieren der Daten aus SplatData
        const positions = splat.data.positions; // Float32Array
        const colors = splat.data.colors; // Uint8Array, optional

        // Erstellen einer Three.js Geometrie
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        // Wenn Farben vorhanden sind, diese auch setzen
        if (colors) {
            geometry.setAttribute('color', new THREE.BufferAttribute(colors, 4, true));
        }

        // Erstellen eines Materials, hier ein einfaches MeshBasicMaterial
        const material = new THREE.MeshBasicMaterial({ vertexColors: true });

        // Mesh erstellen
        const mesh = new THREE.Mesh(geometry, material);

        // Transformationen anwenden
        mesh.position.set(splat.position.x, splat.position.y, splat.position.z);
        mesh.quaternion.set(splat.rotation.x, splat.rotation.y, splat.rotation.z, splat.rotation.w);
        mesh.scale.set(splat.scale.x, splat.scale.y, splat.scale.z);

        // Mesh zur Szene hinzufügen
        tscene.add(mesh);
    
    }

	controller = trenderer.xr.getController( 0 );
	controller.addEventListener( 'select', onSelect );
	tscene.add( controller );

    var loader = new THREE.TextureLoader();

    loader.load(
        `${basePath}assets/DIMSPLAT_Marker.png`,
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
}

function AR() 
{
  var currentSession = null;
  
  if( currentSession == null )
  {
    let options = {
      requiredFeatures: ['dom-overlay', 'hit-test'],
      domOverlay: { root: document.body },
    };
    var sessionInit = getXRSessionInit( 'immersive-ar', {
      mode: 'immersive-ar',
      referenceSpaceType: 'local', // 'local', 'local-floor'
      sessionInit: options
  });
  
  navigator.xr.requestSession( 'immersive-ar', sessionInit ).then( onSessionStarted );
  } else {
    currentSession.end();
  }

  trenderer.xr.addEventListener('sessionstart', function(ev) {
    console.log('sessionstart', ev);
  });
  trenderer.xr.addEventListener('sessionend', function(ev) {
    console.log('sessionend', ev);
  });

  function onSessionStarted( session ) {
    session.addEventListener( 'end', onSessionEnded );
    trenderer.xr.setSession( session );
    button.style.display = 'none';
    button.textContent = 'EXIT AR';
    currentSession = session;
    session.requestReferenceSpace('local').then((refSpace) => {
      xrRefSpace = refSpace;
      session.requestAnimationFrame(onXRFrame);
    });
  }
  function onSessionEnded( /*event*/ ) {
    currentSession.removeEventListener( 'end', onSessionEnded );
    trenderer.xr.setSession( null );
    button.textContent = 'ENTER AR' ;
    currentSession = null;
  }
}

function getXRSessionInit(mode, options) {
  if ( options && options.referenceSpaceType ) {
      trenderer.xr.setReferenceSpaceType( options.referenceSpaceType );
  }
  var space = (options || {}).referenceSpaceType || 'local-floor';
  var sessionInit = (options && options.sessionInit) || {};

  // Nothing to do for default features.
  if ( space == 'viewer' )
      return sessionInit;
  if ( space == 'local' && mode.startsWith('immersive' ) )
      return sessionInit;

  // If the user already specified the space as an optional or required feature, don't do anything.
  if ( sessionInit.optionalFeatures && sessionInit.optionalFeatures.includes(space) )
      return sessionInit;
  if ( sessionInit.requiredFeatures && sessionInit.requiredFeatures.includes(space) )
      return sessionInit;

  var newInit = Object.assign( {}, sessionInit );
  newInit.requiredFeatures = [ space ];
  if ( sessionInit.requiredFeatures ) {
      newInit.requiredFeatures = newInit.requiredFeatures.concat( sessionInit.requiredFeatures );
  }
  return newInit;
}

function onXRFrame(t, frame) {
        
    const session = frame.session;
    session.requestAnimationFrame(onXRFrame);
    const referenceSpace = trenderer.xr.getReferenceSpace();

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

    if ( hitTestSource && searchforhit ) {

        const hitTestResults = frame.getHitTestResults( hitTestSource );

        if ( hitTestResults.length ) {

            const hit = hitTestResults[ 0 ];

            reticle.visible = true;
            reticle.matrix.fromArray( hit.getPose( referenceSpace ).transform.matrix );

        } else {

            reticle.visible = false;

        }
    }

    const baseLayer = session.renderState.baseLayer;
    const pose = frame.getViewerPose(xrRefSpace);

    trenderer.render( tscene, tcamera );
    camera._position.x = scale*movement_scale*tcamera.position.x;
    camera._position.y = -scale*movement_scale*tcamera.position.y;
    camera._position.z = -scale*movement_scale*tcamera.position.z-initial_z;
    
    // let x_position = scale*movement_scale*tcamera.position.x;
    // let y_position = -scale*movement_scale*tcamera.position.y;
    // let z_position = scale*movement_scale*tcamera.position.z-initial_z;
    //
    // let translation = new SPLAT.Vector3(x_position, y_position, z_position);
    // camera.position = camera.position.add(translation);
    
    camera._rotation.x = tcamera.quaternion.x;
    camera._rotation.y = -tcamera.quaternion.y;
    camera._rotation.z = -tcamera.quaternion.z;
    camera._rotation.w = tcamera.quaternion.w;
}

function updateLoadingProgress(progress) {  
  var loadingProgressElement = document.getElementById('loadingProgress');
  
  loadingProgressElement.textContent = `Lädt... ${progress}%`;
  
  if (progress >= 100) {
      loadingProgressElement.style.display = 'none';
  }
}

document.addEventListener('DOMContentLoaded', function() {
    // Initialisiere Objekt zur Speicherung der Werte    
    let cumulativeTranslation = { x: 0, y: 0, z: 0 };

    const updateCoordinateDisplay = (axis, sliderValue) => {
        const value = parseFloat(sliderValue);

        // Berechne die Veränderung basierend auf dem neuen Schiebereglerwert
        const delta = value - cumulativeTranslation[axis];

        // Aktualisiere die kumulative Verschiebung
        cumulativeTranslation[axis] += delta;

        // Erstelle eine neue Translation basierend auf der aktualisierten kumulativen Verschiebung
        var translation = new SPLAT.Vector3(cumulativeTranslation.x, cumulativeTranslation.y, cumulativeTranslation.z);

        // Wende die neue kumulative Verschiebung an
        splat.position = translation;
        splat.applyPosition();
        
        document.getElementById(`value${axis.toUpperCase()}`).innerText = value;
        document.getElementById(`position`).innerText = `(${cumulativeTranslation.x.toFixed(2)}, ${cumulativeTranslation.y.toFixed(2)}, ${cumulativeTranslation.z.toFixed(2)})`;

    };

    document.getElementById('sliderX').oninput = function() {
        updateCoordinateDisplay('x', this.value);
    };

    document.getElementById('sliderY').oninput = function() {
        updateCoordinateDisplay('y', this.value);
    };

    document.getElementById('sliderZ').oninput = function() {
        updateCoordinateDisplay('z', this.value);
    };
});
