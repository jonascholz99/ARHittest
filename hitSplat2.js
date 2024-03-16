import * as SPLAT from 'gsplat';
import * as THREE from 'three';

const scale = 1
const movement_scale = 5
const initial_z = 0

// check path for local or github pages
let basePath;

// Überprüfe den Hostnamen
if (window.location.hostname === "localhost") {  
  basePath = "./splatAR/public/"; // Pfad für Localhost
} else {
  basePath = "./"; // Pfad für Server
}

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
init();

function onWindowResize() 
{
  renderer.setSize(window.innerWidth, window.innerHeight);
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
  const splat = await SPLAT.Loader.LoadAsync(url, scene, (progress) => (updateLoadingProgress(Math.round(progress * 100))));
  
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

  const frame = () => {
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  };

  requestAnimationFrame(frame);

}

function init() {
  tscene = new THREE.Scene();
  tcamera = new THREE.PerspectiveCamera(80, window.innerWidth / window.innerHeight, 0.01, 50 );
  trenderer = new THREE.WebGLRenderer( {antialias: true, alpha: true });
  trenderer.setPixelRatio( window.devicePixelRatio );
  trenderer.setSize( window.innerWidth, window.innerHeight );
  trenderer.xr.enabled = true;
}

function AR() 
{
  var currentSession = null;
  
  if( currentSession == null )
  {
    let options = {
      requiredFeatures: ['dom-overlay'],
      domOverlay: { root: document.body },
    };
    var sessionInit = getXRSessionInit( 'immersive-ar', {
      mode: 'immersive-ar',
      referenceSpaceType: 'viewer', // 'local', 'local-floor'
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

function updateLoadingProgress(progress) {  
  var loadingProgressElement = document.getElementById('loadingProgress');
  
  loadingProgressElement.textContent = `Lädt... ${progress}%`;
  
  if (progress >= 100) {
      loadingProgressElement.style.display = 'none';
  }
}
