import { GAME_CONFIG } from './config.js';

class Scene {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = null;
        this.renderer = null;
        this.ground = null;
        this.player = null;
        this.isRunning = false;
        this.speed = 0;
        this.targetSpeed = 0;
        this.terrainSystem = {
            grounds: [],
            decorations: [],
            segmentLength: 1000,
            segmentWidth: 100,
            activeSegments: 5,
            decorationsPerSegment: 15,
            maxDecorationsPool: 300,
            lastGeneratedZ: 0
        };
        this.decorationPool = [];
    }

    async init() {
        this.initScene();
        this.initCamera();
        this.initRenderer();
        this.initLights();
        this.initTerrain();
        window.addEventListener('resize', this.onWindowResize.bind(this));
    }

    initScene() {
        this.scene.background = new THREE.Color(0x87ceeb);
    }

    initCamera() {
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 2, -5);
        this.camera.lookAt(0, 0, 5);
    }

    initRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            canvas: document.getElementById('gameCanvas'),
            antialias: false,
            powerPreference: 'high-performance',
            precision: 'lowp'
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.BasicShadowMap;
    }

    initLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(0, 50, 0);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);
    }

    initTerrain() {
        // 创建地面材质
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x228B22,
            roughness: 0.8,
            metalness: 0.2
        });

        // 创建装饰物体（树木）
        const treeGeometry = new THREE.CylinderGeometry(0, 1, 4, 4);
        const treeMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22 });
        const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.2, 2, 8);
        const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });

        // 初始化对象池
        for (let i = 0; i < this.terrainSystem.maxDecorationsPool; i++) {
            const tree = new THREE.Group();
            
            const crown = new THREE.Mesh(treeGeometry, treeMaterial);
            crown.position.y = 3;
            crown.castShadow = true;
            tree.add(crown);
            
            const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
            trunk.position.y = 1;
            trunk.castShadow = true;
            tree.add(trunk);
            
            tree.visible = false;
            this.scene.add(tree);
            this.decorationPool.push(tree);
        }

        // 创建初始地形段
        for (let i = 0; i < this.terrainSystem.activeSegments; i++) {
            const groundGeometry = new THREE.PlaneGeometry(
                this.terrainSystem.segmentWidth,
                this.terrainSystem.segmentLength
            );
            const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
            groundMesh.rotation.x = -Math.PI / 2;
            groundMesh.receiveShadow = true;
            groundMesh.position.z = i * this.terrainSystem.segmentLength;
            this.scene.add(groundMesh);
            this.terrainSystem.grounds.push(groundMesh);
            this.terrainSystem.lastGeneratedZ = (i + 1) * this.terrainSystem.segmentLength;

            // 为每个地形段添加装饰物
            this.addDecorationsToSegment(i);
        }
    }

    addDecorationsToSegment(segmentIndex) {
        const newSegmentDecorations = Math.floor(this.terrainSystem.decorationsPerSegment * 1.5);
        for (let i = 0; i < newSegmentDecorations && this.decorationPool.length > 0; i++) {
            const decoration = this.decorationPool.pop();
            decoration.visible = true;

            // 随机位置
            const x = (Math.random() - 0.5) * (this.terrainSystem.segmentWidth - 10);
            const z = segmentIndex * this.terrainSystem.segmentLength + Math.random() * this.terrainSystem.segmentLength;
            decoration.position.set(x, 0, z);

            // 随机旋转和缩放
            decoration.rotation.y = Math.random() * Math.PI * 2;
            const scale = 0.5 + Math.random() * 0.5;
            decoration.scale.set(scale, scale, scale);

            this.terrainSystem.decorations.push(decoration);
        }
    }

    updateSpeed(speed) {
        this.speed = speed;
        
        // 更新相机位置
        const cameraHeight = 2 + Math.sin(performance.now() * 0.004) * (speed * 0.05); // 添加上下晃动
        const cameraX = Math.cos(performance.now() * 0.002) * (speed * 0.03); // 添加左右晃动
        
        // 平滑相机移动
        this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, cameraHeight, 0.1);
        this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, cameraX, 0.1);
        this.camera.position.z += speed * 0.016; // 保持稳定的前进速度
        
        // 相机始终看向前方略高的位置
        const lookAtPoint = new THREE.Vector3(
            0,
            this.camera.position.y + 0.5,
            this.camera.position.z + 10
        );
        this.camera.lookAt(lookAtPoint);

        // 更新地形
        this.updateTerrain();
    }

    updateTerrain() {
        const cameraZ = this.camera.position.z;
        
        // 检查是否需要生成新的地形段
        if (cameraZ + this.terrainSystem.segmentLength > this.terrainSystem.lastGeneratedZ - this.terrainSystem.segmentLength) {
            // 移除最远的地形段
            const oldGround = this.terrainSystem.grounds.shift();
            if (oldGround) {
                oldGround.position.z = this.terrainSystem.lastGeneratedZ;
                this.terrainSystem.grounds.push(oldGround);
                
                // 更新最后生成的Z坐标
                this.terrainSystem.lastGeneratedZ += this.terrainSystem.segmentLength;
            }
            
            // 回收和重用远处的装饰物
            const decorationsToRecycle = this.terrainSystem.decorations.filter(decoration => {
                return decoration.position.z < cameraZ - this.terrainSystem.segmentLength * 2;
            });
            
            decorationsToRecycle.forEach(decoration => {
                decoration.visible = false;
                this.decorationPool.push(decoration);
            });
            
            this.terrainSystem.decorations = this.terrainSystem.decorations.filter(
                decoration => !decorationsToRecycle.includes(decoration)
            );
            
            // 在新地形段添加装饰物
            const newSegmentStart = this.terrainSystem.lastGeneratedZ - this.terrainSystem.segmentLength;
            const newSegmentEnd = this.terrainSystem.lastGeneratedZ;
            
            // 根据速度动态调整装饰物密度
            const speedFactor = Math.max(0.5, Math.min(1.5, this.speed / 5));
            const decorationsToAdd = Math.floor(this.terrainSystem.decorationsPerSegment * speedFactor);
            
            for (let i = 0; i < decorationsToAdd && this.decorationPool.length > 0; i++) {
                const decoration = this.decorationPool.pop();
                if (!decoration) continue;
                
                // 计算新位置
                const z = newSegmentStart + (Math.random() * this.terrainSystem.segmentLength);
                const x = (Math.random() - 0.5) * this.terrainSystem.segmentWidth * 0.8;
                
                decoration.position.set(x, 0, z);
                decoration.rotation.y = Math.random() * Math.PI * 2;
                decoration.visible = true;
                
                // 根据距离设置LOD
                const distanceToCamera = Math.abs(z - cameraZ);
                if (distanceToCamera > 150) {
                    decoration.scale.setScalar(0.3);
                } else if (distanceToCamera > 100) {
                    decoration.scale.setScalar(0.6);
                } else {
                    decoration.scale.setScalar(1.0);
                }
                
                this.terrainSystem.decorations.push(decoration);
            }
        }
        
        // 更新装饰物的LOD
        this.terrainSystem.decorations.forEach(decoration => {
            const distanceToCamera = Math.abs(decoration.position.z - cameraZ);
            let targetScale = 1.0;
            
            if (distanceToCamera > 150) {
                targetScale = 0.3;
            } else if (distanceToCamera > 100) {
                targetScale = 0.6;
            }
            
            // 平滑缩放过渡
            decoration.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
        });
    }

    setRunningState(isRunning, targetSpeed) {
        this.isRunning = isRunning;
        this.targetSpeed = Math.min(targetSpeed, GAME_CONFIG.maxSpeed);
    }

    onWindowResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    render() {
        if (!this.renderer) return;
        
        // 更新阴影相机位置
        const directionalLight = this.scene.children.find(child => child instanceof THREE.DirectionalLight);
        if (directionalLight) {
            directionalLight.position.set(
                this.camera.position.x + 50,
                50,
                this.camera.position.z
            );
            directionalLight.target.position.set(
                this.camera.position.x,
                0,
                this.camera.position.z
            );
            directionalLight.target.updateMatrixWorld();
        }
        
        this.renderer.render(this.scene, this.camera);
    }
}

export const sceneManager = new Scene();
