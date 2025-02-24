import { GAME_CONFIG } from './config.js';

class GameState {
    constructor() {
        this.state = {
            fps: 0,
            movementQuality: 0,
            currentSpeed: 0,
            stepCount: 0,
            debugInfo: '等待开始奔跑...'
        };
        this.lastUpdate = 0;
        this.movementBuffer = [];
    }

    getState() {
        return { ...this.state };
    }

    setState(newState) {
        this.state = { ...this.state, ...newState };
        this.updateDisplay();
    }

    reset() {
        this.state = {
            fps: 0,
            movementQuality: 0,
            currentSpeed: 0,
            stepCount: 0,
            debugInfo: '等待开始奔跑...'
        };
        this.movementBuffer = [];
        this.updateDisplay();
    }

    updateMovement(quality) {
        // 更新动作质量
        this.state.movementQuality = quality * 100;

        // 更新速度
        if (quality > 0) {
            this.state.currentSpeed = Math.min(
                this.state.currentSpeed + GAME_CONFIG.acceleration,
                GAME_CONFIG.maxSpeed
            );
            // 增加步数
            this.state.stepCount++;
        } else {
            this.state.currentSpeed = Math.max(
                0,
                this.state.currentSpeed - GAME_CONFIG.deceleration
            );
        }

        // 更新状态显示
        this.updateDisplay();
    }

    updateDisplay() {
        try {
            // 更新 FPS
            document.getElementById('fps').textContent = Math.round(this.state.fps);
            
            // 更新动作质量
            document.getElementById('quality').textContent = 
                this.state.movementQuality.toFixed(1) + '%';
            
            // 更新速度
            document.getElementById('speed').textContent = 
                this.state.currentSpeed.toFixed(1) + ' m/s' +
                (this.state.currentSpeed === 0 ? ' (等待开始奔跑...)' : '');
            
            // 更新步数
            document.getElementById('steps').textContent = this.state.stepCount;
            
            // 更新调试信息
            document.getElementById('debug').textContent = this.state.debugInfo;
        } catch (error) {
            console.error('更新显示错误:', error);
        }
    }

    updateFPS(fps) {
        this.state.fps = fps;
        this.updateDisplay();
    }
}

export const gameState = new GameState();
