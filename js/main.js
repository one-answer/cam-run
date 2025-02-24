import { GAME_CONFIG } from './config.js';
import { gameState } from './gameState.js';
import { poseDetector } from './pose.js';
import { sceneManager } from './scene.js';
import { renderer } from './renderer.js';

class Game {
    constructor() {
        this.lastTime = 0;
        this.frameCount = 0;
        this.lastFpsUpdate = 0;
        this.isRunning = false;
    }

    async init() {
        try {
            // 初始化渲染器
            renderer.init();
            
            // 初始化场景
            await sceneManager.init();
            
            // 初始化摄像头
            const video = document.getElementById('webcamView');
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: 320,
                    height: 240,
                    frameRate: { ideal: 30 }
                }
            });
            video.srcObject = stream;
            await video.play();

            // 初始化姿势检测
            await poseDetector.init();
            
            // 开始游戏循环
            this.isRunning = true;
            this.animate();
            
            // 开始姿势检测
            poseDetector.startDetection();
            
            console.log('游戏初始化成功');
            gameState.setState({ debugInfo: '准备开始...' });
        } catch (error) {
            console.error('游戏初始化失败:', error);
            gameState.setState({ debugInfo: '初始化失败: ' + error.message });
        }
    }

    animate(currentTime = 0) {
        if (!this.isRunning) return;

        // 计算FPS
        this.frameCount++;
        if (currentTime - this.lastFpsUpdate >= 1000) {
            const fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastFpsUpdate));
            gameState.updateFPS(fps);
            this.frameCount = 0;
            this.lastFpsUpdate = currentTime;
        }

        // 更新场景
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        const state = gameState.getState();
        if (state.currentSpeed > 0) {
            sceneManager.updateSpeed(state.currentSpeed);
        }

        // 渲染场景
        sceneManager.render();

        // 继续动画循环
        requestAnimationFrame(time => this.animate(time));
    }

    reset() {
        gameState.reset();
        poseDetector.calibrate();
    }
}

// 等待页面加载完成后初始化游戏
window.addEventListener('load', () => {
    const game = new Game();
    game.init().catch(console.error);
});
