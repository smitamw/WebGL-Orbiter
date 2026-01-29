import * as THREE from 'three/src/Three';
import { Lensflare, LensflareElement } from 'three/examples/jsm/objects/Lensflare.js';

import { CelestialBody, OrbitalElements, AU, AxisAngleQuaternion, AddPlanetParams, addPlanet } from './CelestialBody';
import { Settings } from './SettingsControl';
import { RotationButtons } from './RotationControl';
import { ModulatedIcosahedronGeometry } from './ModulatedIcosahedronGeometry';
import { GraphicsParams } from './GameState';

import moonUrl from './images/moon.png';
import mercuryUrl from './images/mercury.jpg';
import marsUrl from './images/mars.jpg';
import phobosModelUrl from './models/phobos_tf.obj';
import phobosMtlUrl from './models/phobos_tf.mtl';
import phobosColorUrl from './models/phoboscolor.jpg';
import phobosBumpUrl from './models/phobosbump.jpg';
import deimosModelUrl from './models/deimos_tf.obj';
import deimosMtlUrl from './models/deimos_tf.mtl';
import deimosColorUrl from './models/deimoscolor.jpg';
import deimosBumpUrl from './models/deimosbump.jpg';
import venusUrl from './images/venus.jpg';
import jupiterUrl from './images/jupiter.jpg';
import saturnUrl from './images/saturn.jpg';
import saturnRingUrl from './images/saturnringcolor.jpg';
import saturnRingAlphaUrl from './images/saturnringpattern.gif';
import earthUrl from './images/land_ocean_ice_cloud_2048.jpg';
import europaUrl from './images/europa.jpg';
import ganymedeUrl from './images/ganymede.jpg';
import ioUrl from './images/io.png';
import callistoUrl from './images/callisto.jpg';
import rocketModelUrl from './rocket.obj';
import rocketMtlUrl from './rocket.mtl';
import solarsailModelUrl from './solarsail.obj';
import solarsailMtlUrl from './solarsail.mtl';
import perlinUrl from './images/perlin.jpg';

const GMsun = 1.327124400e11 / AU / AU/ AU; // Product of gravitational constant (G) and Sun's mass (Msun)
const rad_per_deg = Math.PI / 180; // Radians per degrees

export const COLOR_PALETTE = [
    '1 1 1',
    '1 0.75 0.75',
    '0.75 1 0.75',
    '0.75 0.75 1',
    '1 1 0.75',
    '0.75 1 1',
    '1 0.75 1',
    '1 0.25 0.25',
    '0.25 1 0.25',
    '1 0.25 1',
    '0.25 1 1',
    '0.25 0.5 1',
    '0.25 1 0.5',
    '1 0.25 0.25',
    '0.5 1 0.25',
    '1 0.25 0.5',
    '0.5 0.25 1',
];

type AddPlanetArgType = (orbitalElements: OrbitalElements,
    params: AddPlanetParams, orbitGeometry: THREE.BufferGeometry) => CelestialBody;


export default class Universe{
    sun: CelestialBody;
    rocket: CelestialBody;
    light: THREE.PointLight;
    orbitGeometry: THREE.BufferGeometry;
    lensflareElements: LensflareElement[];

    constructor(graphicsParams: GraphicsParams, settings: Settings){
        const { scene, viewScale, camera, windowHalfX, windowHalfY } = graphicsParams;
        this.light = new THREE.PointLight( 0xffffff, 1, 0, 1e-6 );
        scene.add( this.light );
        scene.add( new THREE.AmbientLight( 0x202020 ) );

        const curve = new THREE.EllipseCurve(0, 0, 1, 1,
            0, Math.PI * 2, false, 90);
        const orbitGeometry = new THREE.BufferGeometry().setFromPoints( curve.getPoints(256) );
        this.orbitGeometry = orbitGeometry;

        const group = new THREE.Object3D();
        const material = new THREE.MeshBasicMaterial( { color: 0xffffff } );

        const Rsun = 695800.;
        const sunGeometry = new THREE.SphereGeometry( 1, 20, 20 );

        const day = 24. * 60. * 60.;
        const hour = 60. * 60.;
        const minute = 60.;

        const sunMesh = new THREE.Mesh( sunGeometry, material );
        sunMesh.scale.setScalar(viewScale * Rsun / AU);
        sunMesh.rotation.x = Math.PI / 2;
        group.add( sunMesh );

        // Add lensflare to the light
        const lensflare = new Lensflare();
        
        // Set lensflare to render on top of the sun mesh by disabling depth write on the sun
        // This allows the lensflare to appear unoccluded by the sun sphere
        material.depthWrite = false;
        this.lensflareElements = [];
        
        // Create circular textures for lensflare elements
        const createLensflareTexture = (size: number, color: string = '#ffffff', opacity: number = 1.0) => {
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const context = canvas.getContext('2d')!;
            
            const centerX = size / 2;
            const centerY = size / 2;
            const radius = size / 2;
            
            // Create radial gradient for glow effect
            const gradient = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
            gradient.addColorStop(0, color + Math.floor(opacity * 255).toString(16).padStart(2, '0'));
            gradient.addColorStop(0.7, color + Math.floor(opacity * 128).toString(16).padStart(2, '0'));
            gradient.addColorStop(1, color + '00');
            
            context.fillStyle = gradient;
            context.fillRect(0, 0, size, size);
            
            const texture = new THREE.CanvasTexture(canvas);
            texture.needsUpdate = true;
            return texture;
        };

        // Add lensflare elements with different sizes and distances
        const element1 = new LensflareElement(createLensflareTexture(512, '#ffffff', 0.8), 512, 0, new THREE.Color(0xffffff));
        const element2 = new LensflareElement(createLensflareTexture(512, '#ffff88', 0.6), 512, 0, new THREE.Color(0xffff88));
        const element3 = new LensflareElement(createLensflareTexture(60, '#ffffff', 0.9), 60, 0.6, new THREE.Color(0xffffff));
        const element4 = new LensflareElement(createLensflareTexture(70, '#ffaa44', 0.8), 70, 0.7, new THREE.Color(0xffaa44));
        const element5 = new LensflareElement(createLensflareTexture(120, '#ffffff', 0.7), 120, 0.9, new THREE.Color(0xffffff));
        const element6 = new LensflareElement(createLensflareTexture(70, '#88aaff', 0.6), 70, 1.0, new THREE.Color(0x88aaff));
        
        lensflare.addElement(element1);
        lensflare.addElement(element2);
        lensflare.addElement(element3);
        lensflare.addElement(element4);
        lensflare.addElement(element5);
        lensflare.addElement(element6);
        
        // Store references to elements for scaling
        this.lensflareElements = [element1, element2, element3, element4, element5, element6];
        
        this.light.add(lensflare);

        scene.add(group);

        const addPlanetLocal = (orbitalElements: OrbitalElements, params: AddPlanetParams) =>
            addPlanet(orbitalElements, params, graphicsParams, orbitGeometry, settings);

        this.sun = new CelestialBody(null, new THREE.Vector3(), null, "#ffffff", GMsun, "sun");
        this.sun.radius = Rsun;
        this.sun.model = group;

        const mercury = addPlanetLocal({
            semimajor_axis: 0.387098,
            eccentricity: 0.205630,
            inclination: 7.005 * rad_per_deg,
            ascending_node: 48.331 * rad_per_deg,
            argument_of_perihelion: 29.124 * rad_per_deg
        },
        {
            name: "mercury",
            parent: this.sun,
            color: "#3f7f7f",
            texture: mercuryUrl,
            GM: 22032 / AU / AU / AU,
            radius: 2439.7,
            axialTilt: 2.04 * rad_per_deg,
            rotationPeriod: 58.646 * 24. * 60. * 60.,
            sphereOfInfluence: 2e5,
        });

        const venus = addPlanetLocal({
            semimajor_axis: 0.723332,
            eccentricity: 0.00677323,
            inclination: 3.39458 * rad_per_deg,
            ascending_node: 76.678 * rad_per_deg,
            argument_of_perihelion: 55.186 * rad_per_deg
        },
        {
            name: "venus",
            parent: this.sun,
            color: "#7f7f3f",
            texture: venusUrl,
            GM: 324859 / AU / AU / AU,
            radius: 6051.8,
            axialTilt: 	2.64 * rad_per_deg,
            rotationPeriod: -243. * 24. * 60. * 60.,
            sphereOfInfluence: 5e5,
        });

        // Earth is at 1 AU (which is the AU's definition) and orbits around the ecliptic.
        const earth = addPlanetLocal({
            semimajor_axis: 1,
            eccentricity: 0.0167086,
            inclination: 0,
            ascending_node: -11.26064 * rad_per_deg,
            argument_of_perihelion: 114.20783 * rad_per_deg
        },
        {
            name: "earth",
            parent: this.sun,
            color: "#3f7f3f",
            texture: earthUrl,
            GM: 398600 / AU / AU / AU,
            radius: 6534,
            axialTilt: 23.4392811 * rad_per_deg,
            rotationPeriod: ((23 * 60 + 56) * 60 + 4.10),
            sphereOfInfluence: 5e5
        });

        this.rocket = this.addRocket("rocket",
        {
            semimajor_axis: 10000 / AU,
            eccentricity: 0.,
            inclination: 0,
            ascending_node: 0,
            argument_of_perihelion: 0
        },
        earth,
        graphicsParams,
        settings);

        const moon = addPlanetLocal({
            semimajor_axis: 384399 / AU,
            eccentricity: 0.0167086,
            inclination: 0,
            ascending_node: -11.26064 * rad_per_deg,
            argument_of_perihelion: 114.20783 * rad_per_deg
        },
        {
            name: "moon",
            parent: earth,
            color: "#5f5f5f",
            texture: moonUrl,
            GM: 4904.8695 / AU / AU / AU,
            radius: 1737.1,
            axialTilt: 	1.5424 * rad_per_deg,
            rotationPeriod: 27.321661 * 24. * 60. * 60.,
            sphereOfInfluence: 1e5,
        });

        const mars = addPlanetLocal({
            semimajor_axis: 1.523679,
            eccentricity: 0.0935,
            inclination: 1.850 * rad_per_deg,
            ascending_node: 49.562 * rad_per_deg,
            argument_of_perihelion: 286.537 * rad_per_deg
        },
        {
            name: "mars",
            parent: this.sun,
            color: "#7f3f3f",
            texture: marsUrl,
            GM: 42828 / AU / AU / AU,
            radius: 3389.5,
            axialTilt: 	25.19 * rad_per_deg,
            rotationPeriod: 24.6229 * 60. * 60.,
            sphereOfInfluence: 3e5
        });

        const phobos = addPlanetLocal({
            semimajor_axis: 9376 / AU,
            eccentricity: 0.0151,
            inclination: 1.093 * rad_per_deg,
            ascending_node: 48.331 * rad_per_deg,
            argument_of_perihelion: 29.124 * rad_per_deg
        },
        {
            name: "phobos",
            parent: mars,
            color: "#3f7f7f",
            modelName: phobosModelUrl,
            mtlName: phobosMtlUrl,
            texture: phobosColorUrl,
            textureRename: "phoboscolor.jpg",
            bumpMap: phobosBumpUrl,
            bumpMapRename: "phobosbump.jpg",
            modelScale: 1.5,
            GM: 7.113901872e-05 / AU / AU / AU,
            radius: 11.2667,
            axialTilt: 0,
            rotationPeriod: 7 * hour + 39 * minute + 12.,
            sphereOfInfluence: 2e3,
        });

        const deimos = addPlanetLocal({
            semimajor_axis: 23455.5 / AU,
            eccentricity: 0.00033,
            inclination: 0.93 * rad_per_deg,
            ascending_node: 48.331 * rad_per_deg,
            argument_of_perihelion: 29.124 * rad_per_deg
        },
        {
            name: "deimos",
            parent: mars,
            color: "#3f7f7f",
            modelName: deimosModelUrl,
            mtlName: deimosMtlUrl,
            texture: deimosColorUrl,
            textureRename: "deimoscolor.jpg",
            bumpMap: deimosBumpUrl,
            bumpMapRename: "deimosbump.jpg",
            modelScale: 1.5,
            GM: 7.113901872e-05 / AU / AU / AU,
            radius: 11.2667,
            axialTilt: 0,
            rotationPeriod: 1.263 * day,
            sphereOfInfluence: 1e3,
        });

        const jupiter = addPlanetLocal({
            semimajor_axis: 5.204267,
            eccentricity: 0.048775,
            inclination: 1.305 * rad_per_deg,
            ascending_node: 100.492 * rad_per_deg,
            argument_of_perihelion: 275.066 * rad_per_deg
        },
        {
            name: "jupiter",
            parent: this.sun,
            color: "#7f7f3f",
            texture: jupiterUrl,
            GM: 126686534 / AU / AU / AU,
            radius: 69911,
            axialTilt: 3.13 * rad_per_deg,
            rotationPeriod: 9.925 * 60. * 60.,
            sphereOfInfluence: 10e6,
            oblateness: 0.06487,
        });

        const saturn = addPlanetLocal({
            semimajor_axis: 10.1238,
            eccentricity: 0.0565,
            inclination: 2.485 * rad_per_deg,
            ascending_node: 113.665 * rad_per_deg,
            argument_of_perihelion: 339.392 * rad_per_deg
        },
        {
            name: "saturn",
            parent: this.sun,
            color: "#7f7f5f",
            texture: saturnUrl,
            GM: 3.79315347480608e+6 / AU / AU / AU,
            radius: 60268,
            axialTilt: 26.73 * rad_per_deg,
            rotationPeriod: (10. * 60. + 33.) * 60. + 38.,
            sphereOfInfluence: 10e6,
            oblateness: 0.09796,
            ring: {
                innerRadius: 60268 + 6630,
                outerRadius: 60268 + 120700,
                ringTexture: saturnRingUrl,
                ringAlphaTexture: saturnRingAlphaUrl,
            },
        });

        const europa = addPlanetLocal({
            semimajor_axis: 670900 / AU,
            eccentricity: 0.009,
            inclination: 0.471 * rad_per_deg,
            ascending_node: 190.65 * rad_per_deg,
            argument_of_perihelion: 62.266 * rad_per_deg
        },
        {
            name: "europa",
            parent: jupiter,
            color: "#7f7f7f",
            texture: europaUrl,
            GM: 3202.7 / AU / AU / AU,
            radius: 1560.8,
            axialTilt: 0.1 * rad_per_deg,
            rotationPeriod: 3.551 * day,
            sphereOfInfluence: 8e4,
        });

        const ganymede = addPlanetLocal({
            semimajor_axis: 1070400 / AU,
            eccentricity: 0.0013,
            inclination: 0.2 * rad_per_deg,
            ascending_node: 63.552 * rad_per_deg,
            argument_of_perihelion: 20.0 * rad_per_deg
        },
        {
            name: "ganymede",
            parent: jupiter,
            color: "#9f9f9f",
            texture: ganymedeUrl,
            GM: 9887 / AU / AU / AU,
            radius: 2634.1,
            axialTilt: 0.2 * rad_per_deg,
            rotationPeriod: 7.154 * day,
            sphereOfInfluence: 1.5e5,
        });

        const io = addPlanetLocal({
            semimajor_axis: 421700 / AU,
            eccentricity: 0.0041,
            inclination: 0.04 * rad_per_deg,
            ascending_node: 43.977 * rad_per_deg,
            argument_of_perihelion: 84.129 * rad_per_deg
        },
        {
            name: "io",
            parent: jupiter,
            color: "#ffcc88",
            texture: ioUrl,
            GM: 5959 / AU / AU / AU,
            radius: 1821.6,
            axialTilt: 0.05 * rad_per_deg,
            rotationPeriod: 1.769 * day,
            sphereOfInfluence: 6e4,
        });

        const callisto = addPlanetLocal({
            semimajor_axis: 1882700 / AU,
            eccentricity: 0.0074,
            inclination: 0.3 * rad_per_deg,
            ascending_node: 298.849 * rad_per_deg,
            argument_of_perihelion: 45.0 * rad_per_deg
        },
        {
            name: "callisto",
            parent: jupiter,
            color: "#cfcfcf",
            texture: callistoUrl,
            GM: 7179 / AU / AU / AU,
            radius: 2410.3,
            axialTilt: 0.2 * rad_per_deg,
            rotationPeriod: 16.689 * day,
            sphereOfInfluence: 2.2e5,
        });

        // Use icosahedron instead of sphere to make it look like uniform
        // TODO: use simplex noise to make more smooth asteroid
        const asteroidGeometry = new ModulatedIcosahedronGeometry( 1, 2, (vec) => vec.multiplyScalar(0.3 * (Math.random() - 0.5) + 1) );
        asteroidGeometry.computeVertexNormals();

        // Perlin noise is applied as detail texture.
        // It's asynchrnonous because it's shared by multiple asteroids.
        const asteroidTexture = new THREE.TextureLoader().load(perlinUrl);
        asteroidTexture.wrapS = THREE.RepeatWrapping;
        asteroidTexture.wrapT = THREE.RepeatWrapping;
        asteroidTexture.repeat.set(4, 4);
        const asteroidMaterial = new THREE.MeshLambertMaterial( {
            map: asteroidTexture,
            color: 0xffaf7f, flatShading: false
        } );

        // Randomly generate asteroids
        for (let i = 0; i < 3; i ++ ) {

            const angle = Math.random() * Math.PI * 2;
            const position = new THREE.Vector3();
            position.x = 0.1 * (Math.random() - 0.5);
            position.y = 0.1 * (Math.random() - 0.5) + 1;
            position.z = 0.1 * (Math.random() - 0.5);
            position.applyQuaternion(AxisAngleQuaternion(0, 0, 1, angle));

            position.multiplyScalar(2.5);
            const asteroid = new CelestialBody(this.sun, position, undefined, undefined, undefined, "asteroid" + i);
            asteroid.velocity = new THREE.Vector3((Math.random() - 0.5) * 0.3 - 1, (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3)
                .multiplyScalar(Math.sqrt(GMsun / position.length())).applyQuaternion(AxisAngleQuaternion(0, 0, 1, angle));

            asteroid.radius = Math.random() * 1 + 0.1;
            // We need nested Object3D for NLIPS
            asteroid.model = new THREE.Object3D();
            // The inner Mesh object has scale determined by radius
            const shape = new THREE.Mesh( asteroidGeometry, asteroidMaterial );
            asteroid.model.add(shape);
            const radiusInAu = viewScale * asteroid.radius / AU;
            shape.scale.set(radiusInAu, radiusInAu, radiusInAu);
            shape.up.set(0,0,1);
            scene.add( asteroid.model );

            asteroid.orbitMaterial = new THREE.LineBasicMaterial({color: 0x7f3f7f});
            const orbitMesh = new THREE.Line(orbitGeometry, asteroid.orbitMaterial);
            asteroid.orbit = orbitMesh;
            scene.add(orbitMesh);

            asteroid.init();
            asteroid.update(settings.center_select, viewScale, settings, camera, windowHalfX, windowHalfY,
                (_) => {}, scene);

        }

    }

    addRocket(name: string, orbitalElements: OrbitalElements, parent: CelestialBody, graphicsParams: GraphicsParams, settings: Settings){
        const rocket = addPlanet(orbitalElements,
        {
            name,
            parent,
            color: "#3f7f7f",
            GM: 100 / AU / AU / AU,
            radius: 0.1,
            modelName: rocketModelUrl,
            mtlName: rocketMtlUrl,
            controllable: true
        },
        graphicsParams, this.orbitGeometry, settings);
        rocket.quaternion.multiply(AxisAngleQuaternion(1, 0, 0, Math.PI / 2)).multiply(AxisAngleQuaternion(0, 1, 0, Math.PI / 2));
        rocket.vehicleType = 'rocket';
        return rocket;
    }

    addSolarSail(name: string, orbitalElements: OrbitalElements, parent: CelestialBody, graphicsParams: GraphicsParams, settings: Settings){
        const solarsail = addPlanet(orbitalElements,
        {
            name,
            parent,
            color: "#ffff7f",
            GM: 100 / AU / AU / AU,
            radius: 0.1,
            modelName: solarsailModelUrl,
            mtlName: solarsailMtlUrl,
            controllable: true
        },
        graphicsParams, this.orbitGeometry, settings);
        solarsail.quaternion.multiply(AxisAngleQuaternion(1, 0, 0, Math.PI / 2)).multiply(AxisAngleQuaternion(0, 1, 0, Math.PI / 2));
        solarsail.vehicleType = 'solarsail';
        return solarsail;
    }

    update(center_select: boolean, viewScale: number, settings: Settings,
        camera: THREE.Camera, windowHalfX: number, windowHalfY: number,
        updateOrbitalElements: (o: CelestialBody, headingApoapsis: number) => void,
        scene: THREE.Scene, select_obj?: CelestialBody)
    {
        this.sun.update(center_select, viewScale, settings, camera, windowHalfX, windowHalfY,
            updateOrbitalElements,
            scene,
            select_obj);

        // Update sun light position first
        this.light.position.copy(this.sun.model.position);

        // Update lensflare size using Sun screen-space radius (pixels) for robust distance response
        const distance = camera.position.distanceTo(this.light.position);
        // Sun radius in world units: convert physical km radius to world units using viewScale and AU
        const sunRadiusWorld = (this.sun.radius / AU) * viewScale;

        // Angular radius (half-angle) in radians
        const angularRadius = Math.atan2(sunRadiusWorld, Math.max(distance, 1e-6));

        // If camera is perspective, convert angular radius to screen pixels using fov
        let ratio = 1.0;
        if ((camera as any).isPerspectiveCamera && (camera as any).fov) {
            const cam = camera as THREE.PerspectiveCamera;
            const fovRad = cam.fov * Math.PI / 180;
            const pixelRadius = Math.tan(angularRadius) / Math.tan(fovRad / 2) * windowHalfY;

            // Reference: pixel radius at 1 AU
            const referenceDistance = AU * viewScale;
            const referenceAngular = Math.atan2(sunRadiusWorld, Math.max(referenceDistance, 1e-6));
            const referencePixel = Math.tan(referenceAngular) / Math.tan(fovRad / 2) * windowHalfY;

            ratio = referencePixel > 0 ? (pixelRadius / referencePixel) : 1.0;
        } else {
            // Fallback: use angular ratio if not perspective
            const referenceDistance = AU * viewScale;
            const referenceAngular = Math.atan2(sunRadiusWorld, Math.max(referenceDistance, 1e-6));
            ratio = referenceAngular > 0 ? (angularRadius / referenceAngular) : 1.0;
        }

        // Clamp ratio and apply slider
        ratio = Math.max(0.02, Math.min(16.0, ratio));
        const sliderFactor = settings.lensflare_size / 200;
        const finalMultiplier = sliderFactor * ratio;

        // Update lensflare element sizes using stored references
        const baseSizes = [512, 512, 60, 70, 120, 70];
        this.lensflareElements.forEach((element: LensflareElement, index: number) => {
            element.size = baseSizes[index] * finalMultiplier;
        });
    }

    simulateBody(deltaTime: number, div: number, timescale: number, buttons: RotationButtons, select_obj?: CelestialBody){
        this.sun.simulateBody(deltaTime, div, timescale, buttons, select_obj);
    }
}
