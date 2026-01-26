import * as THREE from 'three/src/Three';

import { MenuControl } from './MenuControl';
import { AU, AxisAngleQuaternion, CelestialBody } from './CelestialBody';

import menuIconUrl from './images/menuIcon.png';


export class ScenarioSelectorControl extends MenuControl{

    protected getSelectObj: () => CelestialBody;
    protected showEvent: () => void;
    protected selectedScenario: any;
    protected selectedDeltaV: number;
    protected selectedVehicle: string;

    constructor(
        getRocket: () => CelestialBody,
        setSelectObj: (obj: CelestialBody) => void,
        setThrottle: (throttle: number) => void,
        resetTime: () => void,
        sendMessage: (msg: string) => void,
        showEvent: () => void)
    {
        const config = {
            buttonTop: 0,
            buttonHeight: 32,
            buttonWidth: 32,
            innerTitle: "Scenario Selector",
        };
        super('Scenarios', menuIconUrl, config);

        this.getSelectObj = getRocket;
        this.showEvent = showEvent;
        this.selectedScenario = null;
        this.selectedDeltaV = 5;
        this.selectedVehicle = 'rocket';

        this.valueElement.style.border = "5px ridge #ffff7f";
        this.valueElement.style.display = "flex";
        this.valueElement.style.flexDirection = "column";

        const scenarios: {
            title: string,
            parent: string,
            semimajor_axis: number,
            ascending_node?: number,
            eccentricity?: number,
            rotation?: THREE.Quaternion,
            inclination?: number,
        }[] = [
            {title: "Earth orbit", parent: "earth", semimajor_axis: 10000 / AU},
            {title: "Moon orbit", parent: "moon", semimajor_axis: 3000 / AU},
            {title: "Mars orbit", parent: "mars", semimajor_axis: 5000 / AU},
            {title: "Venus orbit", parent: "venus", semimajor_axis: 10000 / AU, ascending_node: Math.PI},
            {title: "Jupiter orbit", parent: "jupiter", semimajor_axis: 100000 / AU},
            {title: "Saturn orbit", parent: "saturn", semimajor_axis: 65000 / AU, inclination: 12 * Math.PI / 180},
        ];

        // Create layout: left for scenarios, right for delta-V
        const layoutDiv = document.createElement('div');
        layoutDiv.style.display = "flex";
        layoutDiv.style.width = "100%";

        const leftDiv = document.createElement('div');
        leftDiv.style.flex = "1";
        leftDiv.style.padding = "10px";
        leftDiv.innerHTML = "<h3>Scenarios</h3>";

        const rightDiv = document.createElement('div');
        rightDiv.style.flex = "1";
        rightDiv.style.padding = "10px";
        rightDiv.innerHTML = "<h3>Delta-V (km/s)</h3>";

        // Scenarios as radio buttons
        for(let i = 0; i < scenarios.length; i++){
            const label = document.createElement('label');
            label.style.display = "block";
            label.style.margin = "5px 0";
            const radio = document.createElement('input');
            radio.type = "radio";
            radio.name = "scenario";
            radio.value = i.toString();
            radio.onchange = () => this.selectedScenario = scenarios[i];
            label.appendChild(radio);
            label.appendChild(document.createTextNode(scenarios[i].title));
            leftDiv.appendChild(label);
        }

        // Delta-V select
        const deltaVSelect = document.createElement('select');
        deltaVSelect.style.width = "100%";
        deltaVSelect.appendChild(new Option("Infinite", "-1"));
        for(let dv = 5; dv <= 10; dv += 0.5){ // 5 to 10 in 0.5 km/s steps
            const option = document.createElement('option');
            option.value = dv.toString();
            option.text = dv.toString();
            if(dv === 5) option.selected = true;
            deltaVSelect.appendChild(option);
        }
        deltaVSelect.onchange = () => this.selectedDeltaV = parseFloat(deltaVSelect.value);
        rightDiv.appendChild(deltaVSelect);

        // Vehicle select
        const vehicleLabel = document.createElement('h3');
        vehicleLabel.innerHTML = "Vehicle";
        rightDiv.appendChild(vehicleLabel);
        const vehicleSelect = document.createElement('select');
        vehicleSelect.style.width = "100%";
        vehicleSelect.appendChild(new Option("Rocket", "rocket"));
        vehicleSelect.appendChild(new Option("Solar Sail", "solarsail"));
        vehicleSelect.onchange = () => this.selectedVehicle = vehicleSelect.value;
        rightDiv.appendChild(vehicleSelect);

        layoutDiv.appendChild(leftDiv);
        layoutDiv.appendChild(rightDiv);
        this.valueElement.appendChild(layoutDiv);

        // Set Scenario button
        const setButton = document.createElement('button');
        setButton.innerHTML = "Set Scenario";
        setButton.style.margin = "10px";
        setButton.style.padding = "10px";
        setButton.onclick = () => {
            if(!this.selectedScenario){
                sendMessage('Please select a scenario.');
                return;
            }
            const ascending_node = this.selectedScenario.ascending_node || 0.;
            var eccentricity = this.selectedScenario.eccentricity || 0.;
            var rotation = this.selectedScenario.rotation ?? (() => {
                var rotation = AxisAngleQuaternion(0, 0, 1, ascending_node - Math.PI / 2);
                rotation.multiply(AxisAngleQuaternion(0, 1, 0, Math.PI - (this.selectedScenario.inclination ?? 0)));
                return rotation;
            })();
            const select_obj = getRocket();
            const parent = CelestialBody.findBody(this.selectedScenario.parent);
            if(!parent)
                return;
            select_obj.setParent(parent);
            select_obj.position = new THREE.Vector3(0, 1 - eccentricity, 0)
                .multiplyScalar(this.selectedScenario.semimajor_axis).applyQuaternion(rotation);
            select_obj.quaternion = rotation.clone();
            select_obj.quaternion.multiply(AxisAngleQuaternion(1, 0, 0, -Math.PI / 2));
            select_obj.angularVelocity = new THREE.Vector3();
            setThrottle(0);
            select_obj.setOrbitingVelocity(this.selectedScenario.semimajor_axis, rotation);
            select_obj.totalDeltaV = 0.;
            select_obj.maxDeltaV = this.selectedDeltaV === -1 ? 0 : this.selectedDeltaV / AU; // Convert km/s to AU/s, 0 for infinite
            select_obj.ignitionCount = 0;
            select_obj.vehicleType = this.selectedVehicle;
            setSelectObj(select_obj);
            resetTime();
            sendMessage('Scenario ' + this.selectedScenario.title + ' Loaded with ' + (this.selectedDeltaV === -1 ? 'Infinite' : this.selectedDeltaV + ' km/s') + ' delta-V!');
            this.title.style.display = 'none';
            this.visible = false;
            this.valueElement.style.display = 'none';
        };
        this.valueElement.appendChild(setButton);
    }

    setVisible(v: boolean){
        super.setVisible.call(this, v);
        if(this.visible){
            this.showEvent();
        }
    }
}