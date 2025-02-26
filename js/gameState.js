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
        
        // 步数检测相关变量
        this.lastStepTime = 0;
        this.armPhase = 'neutral'; // 'left_up', 'right_up', 'neutral'
        this.lastArmPhase = 'neutral';
        this.stepDetectionCooldown = false;
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
        this.lastStepTime = 0;
        this.armPhase = 'neutral';
        this.lastArmPhase = 'neutral';
        this.stepDetectionCooldown = false;
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
            
            // 检测步数 - 使用更合理的步数检测机制
            this.detectAndCountSteps(quality);
        } else {
            this.state.currentSpeed = Math.max(
                0,
                this.state.currentSpeed - GAME_CONFIG.deceleration
            );
        }

        // 更新状态显示
        this.updateDisplay();
    }
    
    // 基于手臂位置变化的步数检测
    detectAndCountSteps(quality) {
        const now = performance.now();
        
        // 只有当动作质量超过阈值时才考虑计步
        if (quality < GAME_CONFIG.stepDetectionThreshold) {
            this.armPhase = 'neutral';
            return;
        }
        
        // 从姿势检测器获取当前手臂相位
        if (window.currentArmPhase) {
            this.armPhase = window.currentArmPhase;
        }
        
        // 检测手臂相位变化，表示一个步伐
        // 修改：每次手臂相位变化都计为一步（从中性状态变为任一手臂抬起，或者从一只手臂抬起变为另一只手臂抬起）
        const isPhaseChange = (
            (this.lastArmPhase !== this.armPhase) && 
            !(this.lastArmPhase === 'neutral' && this.armPhase === 'neutral')
        );
        
        // 确保步数检测有冷却时间，防止过快计步
        const canCountStep = !this.stepDetectionCooldown && 
                             (now - this.lastStepTime) > GAME_CONFIG.minStepInterval;
        
        if (isPhaseChange && canCountStep) {
            // 增加步数（每次相位变化增加1步）
            this.state.stepCount++;
            this.lastStepTime = now;
            
            // 设置冷却时间
            this.stepDetectionCooldown = true;
            setTimeout(() => {
                this.stepDetectionCooldown = false;
            }, GAME_CONFIG.minStepInterval);
            
            // 更新调试信息
            this.state.debugInfo = `检测到步伐: ${this.armPhase} (总步数: ${this.state.stepCount})`;
        }
        
        // 更新上一次的手臂相位
        this.lastArmPhase = this.armPhase;
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
