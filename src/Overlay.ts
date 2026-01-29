import * as THREE from 'three/src/Three';
import { navballRadius } from './RotationControl';
import { CelestialBody, AxisAngleQuaternion } from './CelestialBody';
import { RotationButtons } from './RotationControl';

import navballUrl from './images/navball.png';
import watermarkUrl from './images/watermark.png';
import progradeUrl from './images/prograde.png';
import retrogradeUrl from './images/retrograde.png';
import normalUrl from './images/normal.png';
import antiNormalUrl from './images/antinormal.png';
import radialOutUrl from './images/radialout.png';
import radialInUrl from './images/radialin.png';


export default class Overlay{
    readonly overlayCamera: THREE.OrthographicCamera;
    readonly overlay: THREE.Scene;
    protected navballMesh: THREE.Mesh;
    protected prograde: THREE.Mesh;
    protected retrograde: THREE.Mesh;
    protected normal: THREE.Mesh;
    protected antiNormal: THREE.Mesh;
    protected radialOut: THREE.Mesh;
    protected radialIn: THREE.Mesh;

    // SAS widget
    protected sasEnabled: boolean = false;
    protected sasTargetDirection: THREE.Vector3 | null = null;
    protected sasIcons: THREE.Mesh[] = [];
    protected sasButton: THREE.Mesh;
    protected pidController: { p: number, i: number, d: number, integral: THREE.Vector3, prevError: THREE.Vector3 };
    protected rotationButtons: RotationButtons;

    constructor(rotationButtons: RotationButtons, getSelectObj?: () => CelestialBody){
        this.rotationButtons = rotationButtons;
        this.getSelectObj = getSelectObj;
        this.overlayCamera = new THREE.OrthographicCamera( window.innerWidth / - 2, window.innerWidth / 2, window.innerHeight / 2, window.innerHeight / - 2, -1000, 1000 );
        window.addEventListener('resize', () => {
            this.overlayCamera.left = window.innerWidth / - 2;
            this.overlayCamera.right = window.innerWidth / 2;
            this.overlayCamera.top = window.innerHeight / 2;
            this.overlayCamera.bottom = window.innerHeight / - 2;
            this.overlayCamera.updateProjectionMatrix();
        });

        this.overlay = new THREE.Scene();
        const loader = new THREE.TextureLoader();
        loader.load( navballUrl, (texture) => {

            const geometry = new THREE.SphereGeometry( navballRadius, 20, 20 );

            const material = new THREE.MeshBasicMaterial( { map: texture, depthTest: false, depthWrite: false } );
            this.navballMesh = new THREE.Mesh(geometry, material);
            this.overlay.add(this.navballMesh);

            const spriteMaterial = new THREE.SpriteMaterial({
                map: new THREE.TextureLoader().load( watermarkUrl ),
                depthTest: false,
                depthWrite: false,
                transparent: true,
            });
            const watermark = new THREE.Sprite(spriteMaterial);
            watermark.scale.set(64, 32, 64);
            this.navballMesh.add(watermark);
        } );

        const spriteGeometry = new THREE.PlaneGeometry( 40, 40 );
        this.prograde = new THREE.Mesh(spriteGeometry,
            new THREE.MeshBasicMaterial({
                map: new THREE.TextureLoader().load( progradeUrl ),
                color: 0xffffff,
                side: THREE.DoubleSide,
                depthTest: false,
                depthWrite: false,
                transparent: true,
            } )
        );
        this.overlay.add(this.prograde);
        this.retrograde = new THREE.Mesh(spriteGeometry,
            new THREE.MeshBasicMaterial({
                map: new THREE.TextureLoader().load( retrogradeUrl ),
                color: 0xffffff,
                side: THREE.DoubleSide,
                depthTest: false,
                depthWrite: false,
                transparent: true,
            } )
        );
        this.overlay.add(this.retrograde);

        this.normal = new THREE.Mesh(spriteGeometry,
            new THREE.MeshBasicMaterial({
                map: new THREE.TextureLoader().load( normalUrl ),
                color: 0xffffff,
                side: THREE.DoubleSide,
                depthTest: false,
                depthWrite: false,
                transparent: true,
            } )
        );
        this.overlay.add(this.normal);

        this.antiNormal = new THREE.Mesh(spriteGeometry,
            new THREE.MeshBasicMaterial({
                map: new THREE.TextureLoader().load( antiNormalUrl ),
                color: 0xffffff,
                side: THREE.DoubleSide,
                depthTest: false,
                depthWrite: false,
                transparent: true,
            } )
        );
        this.overlay.add(this.antiNormal);

        this.radialOut = new THREE.Mesh(spriteGeometry,
            new THREE.MeshBasicMaterial({
                map: new THREE.TextureLoader().load( radialOutUrl ),
                color: 0xffffff,
                side: THREE.DoubleSide,
                depthTest: false,
                depthWrite: false,
                transparent: true,
            } )
        );
        this.overlay.add(this.radialOut);

        this.radialIn = new THREE.Mesh(spriteGeometry,
            new THREE.MeshBasicMaterial({
                map: new THREE.TextureLoader().load( radialInUrl ),
                color: 0xffffff,
                side: THREE.DoubleSide,
                depthTest: false,
                depthWrite: false,
                transparent: true,
            } )
        );
        this.overlay.add(this.radialIn);

        // Initialize SAS widget
        this.initializeSASWidget();

    }

    protected initializeSASWidget() {
        // PID controller initialization
        this.pidController = { p: 2.0, i: 0.1, d: 0.5, integral: new THREE.Vector3(), prevError: new THREE.Vector3() };

        const iconSize = 32;
        const iconGeometry = new THREE.PlaneGeometry(iconSize, iconSize);
        const iconSpacing = 36; // Reduced spacing
        const gridStartX = navballRadius + 50; // Position next to navball
        const gridStartY = -window.innerHeight / 2 + navballRadius + 60; // Start higher up

        // SAS icons in 2x3 grid: prograde, retrograde, normal, antinormal, radial out, radial in
        const iconUrls = [progradeUrl, retrogradeUrl, normalUrl, antiNormalUrl, radialOutUrl, radialInUrl];
        const directionTypes = ['prograde', 'retrograde', 'normal', 'antinormal', 'radialout', 'radialin'];

        for (let i = 0; i < 6; i++) {
            const row = Math.floor(i / 2);
            const col = i % 2;
            const x = gridStartX + col * iconSpacing;
            const y = gridStartY - row * iconSpacing;

            const icon = new THREE.Mesh(iconGeometry,
                new THREE.MeshBasicMaterial({
                    map: new THREE.TextureLoader().load(iconUrls[i]),
                    color: 0xffffff,
                    side: THREE.DoubleSide,
                    depthTest: false,
                    depthWrite: false,
                    transparent: true,
                })
            );
            icon.position.set(x, y, 0);
            icon.userData = { 
                directionType: directionTypes[i], 
                screenRect: { 
                    x: x - iconSize/2, 
                    y: y - iconSize/2, 
                    width: iconSize, 
                    height: iconSize 
                } 
            };
            this.overlay.add(icon);
            this.sasIcons.push(icon);
        }

        // SAS enable/disable button
        const buttonGeometry = new THREE.PlaneGeometry(80, 20);
        this.sasButton = new THREE.Mesh(buttonGeometry,
            new THREE.MeshBasicMaterial({
                color: this.sasEnabled ? 0x00ff00 : 0xff0000,
                side: THREE.DoubleSide,
                depthTest: false,
                depthWrite: false,
            })
        );
        this.sasButton.position.set(gridStartX + iconSpacing, gridStartY - 2.5 * iconSpacing, 0);
        this.sasButton.userData = { 
            isSASButton: true, 
            screenRect: { 
                x: gridStartX + iconSpacing - 40, // 80/2 = 40
                y: gridStartY - 2.5 * iconSpacing - 10, // 20/2 = 10
                width: 80, 
                height: 20 
            }
        };
        this.overlay.add(this.sasButton);

        // Add click event listeners
        this.setupSASClickHandlers();
    }

    protected setupSASClickHandlers() {
        // Add mouse click event listener to document
        document.addEventListener('click', (event) => this.handleSASClick(event));
    }

    protected handleSASClick(event: MouseEvent) {
        // Convert mouse coordinates to overlay coordinates
        const overlayX = event.clientX - window.innerWidth / 2;
        const overlayY = -(event.clientY - window.innerHeight / 2);

        const select_obj = this.getSelectObj?.();
        if (!select_obj || !select_obj.controllable) return;

        // Check SAS button
        if (this.sasButton && this.sasButton.userData.screenRect) {
            const rect = this.sasButton.userData.screenRect;
            if (overlayX >= rect.x && overlayX <= rect.x + rect.width &&
                overlayY >= rect.y - rect.height/2 && overlayY <= rect.y + rect.height/2) {
                this.toggleSAS();
                return;
            }
        }

        // Check SAS icons
        for (const icon of this.sasIcons) {
            if (icon.userData.screenRect) {
                const rect = icon.userData.screenRect;
                if (overlayX >= rect.x - rect.width/2 && overlayX <= rect.x + rect.width/2 &&
                    overlayY >= rect.y - rect.height/2 && overlayY <= rect.y + rect.height/2) {
                    this.setSASTarget(select_obj, icon.userData.directionType);
                    return;
                }
            }
        }
    }

    // Need access to getSelectObj - add this property
    protected getSelectObj?: () => CelestialBody;

    // Method to set SAS target direction
    setSASTarget(select_obj: CelestialBody, directionType: string) {
        if (!select_obj || !select_obj.controllable) return;

        let targetDirection: THREE.Vector3;
        switch (directionType) {
            case 'prograde':
                targetDirection = select_obj.velocity.clone().normalize();
                break;
            case 'retrograde':
                targetDirection = select_obj.velocity.clone().normalize().negate();
                break;
            case 'normal':
                targetDirection = select_obj.position.clone().cross(select_obj.velocity).normalize();
                break;
            case 'antinormal':
                targetDirection = select_obj.position.clone().cross(select_obj.velocity).normalize().negate();
                break;
            case 'radialout':
                targetDirection = select_obj.position.clone().normalize();
                break;
            case 'radialin':
                targetDirection = select_obj.position.clone().normalize().negate();
                break;
            default:
                return;
        }

        this.sasTargetDirection = targetDirection;
        this.sasEnabled = true;
        this.updateSASButton();
        this.updateSASIconColors(select_obj);
    }

    // Method to toggle SAS
    toggleSAS() {
        this.sasEnabled = !this.sasEnabled;
        if (!this.sasEnabled) {
            this.sasTargetDirection = null;
        }
        this.updateSASButton();
        // Note: updateSASIconColors will be called in the update method
    }

    // Update SAS button appearance
    protected updateSASButton() {
        if (this.sasButton && this.sasButton.material instanceof THREE.MeshBasicMaterial) {
            this.sasButton.material.color.setHex(this.sasEnabled ? 0x00ff00 : 0xff0000);
        }
    }

    // Update SAS icon colors to show active target
    protected updateSASIconColors(select_obj: CelestialBody) {
        const directionTypes = ['prograde', 'retrograde', 'normal', 'antinormal', 'radialout', 'radialin'];
        this.sasIcons.forEach((icon, index) => {
            if (icon.material instanceof THREE.MeshBasicMaterial) {
                const targetVector = this.getDirectionVector(select_obj, directionTypes[index]);
                const isActive = this.sasEnabled && this.sasTargetDirection !== null && 
                    targetVector !== null && this.sasTargetDirection.equals(targetVector);
                icon.material.color.setHex(isActive ? 0x00ff00 : 0xffffff);
            }
        });
    }

    // Helper method to get direction vector for a given type
    private getDirectionVector(select_obj: CelestialBody | undefined, directionType: string): THREE.Vector3 | null {
        if (!select_obj) return null;
        
        switch (directionType) {
            case 'prograde':
                return select_obj.velocity.clone().normalize();
            case 'retrograde':
                return select_obj.velocity.clone().normalize().negate();
            case 'normal':
                return select_obj.position.clone().cross(select_obj.velocity).normalize();
            case 'antinormal':
                return select_obj.position.clone().cross(select_obj.velocity).normalize().negate();
            case 'radialout':
                return select_obj.position.clone().normalize();
            case 'radialin':
                return select_obj.position.clone().normalize().negate();
            default:
                return null;
        }
    }

    // PID control for SAS
    protected updateSASControl(select_obj: CelestialBody, deltaTime: number) {
        if (!this.sasEnabled || !this.sasTargetDirection || !select_obj.controllable) {
            return;
        }

        // Current ship forward direction (assuming +X is forward)
        const currentDirection = new THREE.Vector3(1, 0, 0).applyQuaternion(select_obj.quaternion);

        // Error is the cross product (torque needed)
        const error = new THREE.Vector3().crossVectors(currentDirection, this.sasTargetDirection);

        // PID calculation
        this.pidController.integral.add(error.clone().multiplyScalar(deltaTime));
        const derivative = error.clone().sub(this.pidController.prevError).divideScalar(deltaTime);

        const output = error.clone().multiplyScalar(this.pidController.p)
            .add(this.pidController.integral.clone().multiplyScalar(this.pidController.i))
            .add(derivative.multiplyScalar(this.pidController.d));

        this.pidController.prevError.copy(error);

        // Apply SAS rotation directly to angular velocity (don't interfere with manual buttons)
        const angleAcceleration = 1e-0; // Same as in CelestialBody.simulateBody
        const div = 1; // Assuming div=1 for now, should match the physics simulation

        if (output.z > 0.1) select_obj.angularVelocity.add(new THREE.Vector3(0, 0, 1).applyQuaternion(select_obj.quaternion).multiplyScalar(angleAcceleration * deltaTime / div));
        if (output.z < -0.1) select_obj.angularVelocity.add(new THREE.Vector3(0, 0, -1).applyQuaternion(select_obj.quaternion).multiplyScalar(angleAcceleration * deltaTime / div));
        if (output.y > 0.1) select_obj.angularVelocity.add(new THREE.Vector3(0, 1, 0).applyQuaternion(select_obj.quaternion).multiplyScalar(angleAcceleration * deltaTime / div));
        if (output.y < -0.1) select_obj.angularVelocity.add(new THREE.Vector3(0, -1, 0).applyQuaternion(select_obj.quaternion).multiplyScalar(angleAcceleration * deltaTime / div));
        if (output.x > 0.1) select_obj.angularVelocity.add(new THREE.Vector3(1, 0, 0).applyQuaternion(select_obj.quaternion).multiplyScalar(angleAcceleration * deltaTime / div));
        if (output.x < -0.1) select_obj.angularVelocity.add(new THREE.Vector3(-1, 0, 0).applyQuaternion(select_obj.quaternion).multiplyScalar(angleAcceleration * deltaTime / div));
    }

    protected updateRotation(select_obj: CelestialBody){
        if(!(this.navballMesh && select_obj && select_obj.controllable))
            return;
        // First, calculate the quaternion for rotating the system so that
        // X axis points north, Y axis points east and Z axis points zenith.
        const north = new THREE.Vector3(0, 0, 1).applyQuaternion(select_obj.getParent().quaternion);
        const tangent = north.cross(select_obj.position).normalize();
        const qball = new THREE.Quaternion();
        const mat = new THREE.Matrix4();
        const normal = select_obj.position.clone().normalize().negate();
        mat.makeBasis(tangent.clone().cross(normal), tangent, normal);
        qball.setFromRotationMatrix (mat);

        this.navballMesh.quaternion.copy(
            AxisAngleQuaternion(0, 1, 0, -1*Math.PI / 2)
            .multiply(AxisAngleQuaternion(0, 0, 1, Math.PI))
            .multiply(select_obj.quaternion.clone().conjugate())
            .multiply(qball)
            .multiply(AxisAngleQuaternion(1, 0, 0, Math.PI / 2))
            );
        this.navballMesh.position.y = -window.innerHeight / 2 + navballRadius;
        let grade;
        let factor;
        if(new THREE.Vector3(1, 0, 0).applyQuaternion(select_obj.quaternion).dot(select_obj.velocity) < 0){
            grade = this.retrograde;
            this.prograde.visible = false;
            factor = -1.;
        }
        else{
            grade = this.prograde;
            this.retrograde.visible = false;
            factor = 1.;
        }
        grade.visible = true;
        grade.position.y = -window.innerHeight / 2 + navballRadius + factor * new THREE.Vector3(0, 1, 0).applyQuaternion(select_obj.quaternion).dot(select_obj.velocity) / select_obj.velocity.length() * navballRadius;
        grade.position.x = factor * new THREE.Vector3(0, 0, 1).applyQuaternion(select_obj.quaternion).dot(select_obj.velocity) / select_obj.velocity.length() * navballRadius;

        // Calculate angular momentum for normal directions
        const h = select_obj.position.clone().cross(select_obj.velocity).normalize();
        const normalDir = h;
        const antiNormalDir = h.clone().negate();

        // Radial directions
        const radialOutDir = select_obj.position.clone().normalize();
        const radialInDir = radialOutDir.clone().negate();

        // Position normal
        const normalLocal = normalDir.clone().applyQuaternion(this.navballMesh.quaternion.clone().conjugate());
        this.normal.position.y = -window.innerHeight / 2 + navballRadius + new THREE.Vector3(0, 1, 0).applyQuaternion(select_obj.quaternion).dot(normalDir) * navballRadius;
        this.normal.position.x = new THREE.Vector3(0, 0, 1).applyQuaternion(select_obj.quaternion).dot(normalDir) * navballRadius;
        this.normal.position.z = normalLocal.z < 0 ? -1 : 1; // Front markers at z=-1, back at z=1
        const normalDistanceFromCamera = this.normal.position.z; // Larger z means farther from camera
        const navballDistanceFromCamera = 0; // Navball at z=0
        this.normal.visible = normalDistanceFromCamera <= navballDistanceFromCamera;

        // Position anti-normal
        const antiNormalLocal = antiNormalDir.clone().applyQuaternion(this.navballMesh.quaternion.clone().conjugate());
        this.antiNormal.position.y = -window.innerHeight / 2 + navballRadius + new THREE.Vector3(0, 1, 0).applyQuaternion(select_obj.quaternion).dot(antiNormalDir) * navballRadius;
        this.antiNormal.position.x = new THREE.Vector3(0, 0, 1).applyQuaternion(select_obj.quaternion).dot(antiNormalDir) * navballRadius;
        this.antiNormal.position.z = antiNormalLocal.z < 0 ? -1 : 1;
        const antiNormalDistanceFromCamera = this.antiNormal.position.z;
        this.antiNormal.visible = antiNormalDistanceFromCamera <= navballDistanceFromCamera;

        // Position radial out
        const radialOutLocal = radialOutDir.clone().applyQuaternion(this.navballMesh.quaternion.clone().conjugate());
        this.radialOut.position.y = -window.innerHeight / 2 + navballRadius + new THREE.Vector3(0, 1, 0).applyQuaternion(select_obj.quaternion).dot(radialOutDir) * navballRadius;
        this.radialOut.position.x = new THREE.Vector3(0, 0, 1).applyQuaternion(select_obj.quaternion).dot(radialOutDir) * navballRadius;
        this.radialOut.position.z = radialOutLocal.z < 0 ? -1 : 1;
        const radialOutDistanceFromCamera = this.radialOut.position.z;
        this.radialOut.visible = radialOutDistanceFromCamera <= navballDistanceFromCamera;

        // Position radial in
        const radialInLocal = radialInDir.clone().applyQuaternion(this.navballMesh.quaternion.clone().conjugate());
        this.radialIn.position.y = -window.innerHeight / 2 + navballRadius + new THREE.Vector3(0, 1, 0).applyQuaternion(select_obj.quaternion).dot(radialInDir) * navballRadius;
        this.radialIn.position.x = new THREE.Vector3(0, 0, 1).applyQuaternion(select_obj.quaternion).dot(radialInDir) * navballRadius;
        this.radialIn.position.z = radialInLocal.z < 0 ? -1 : 1;
        const radialInDistanceFromCamera = this.radialIn.position.z;
        this.radialIn.visible = radialInDistanceFromCamera <= navballDistanceFromCamera;
    }

    update(select_obj: CelestialBody, deltaTime: number = 0.016){
        this.updateRotation(select_obj);
        this.updateSASControl(select_obj, deltaTime);
        this.updateSASIconColors(select_obj);
        
        if(select_obj.controllable){
            if(this.navballMesh)
                this.navballMesh.visible = true;
            // Show SAS widget
            this.sasIcons.forEach(icon => icon.visible = true);
            this.sasButton.visible = true;
        }
        else{
            if(this.navballMesh)
                this.navballMesh.visible = false;
            this.retrograde.visible = this.prograde.visible = false;
            this.normal.visible = this.antiNormal.visible = this.radialOut.visible = this.radialIn.visible = false;
            // Hide SAS widget
            this.sasIcons.forEach(icon => icon.visible = false);
            this.sasButton.visible = false;
        }
    }

    render(renderer: THREE.Renderer){
        renderer.render( this.overlay, this.overlayCamera);
    }
}