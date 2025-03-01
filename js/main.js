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
            // 初始化游戏状态
            gameState.init();
            
            // 初始化渲染器
            renderer.init();
            
            // 初始化场景
            await sceneManager.init();
            
            // 检测操作系统
            const isMacOS = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
            if (isMacOS) {
                console.log('检测到macOS平台，使用特殊处理...');
                gameState.setState({ debugInfo: '检测到macOS平台，正在初始化摄像头...' });
            }
            
            // 初始化摄像头
            const video = document.getElementById('webcamView');
            
            try {
                // 首先检查是否在HTTPS环境下
                const isSecure = window.location.protocol === 'https:' || 
                                window.location.hostname === 'localhost' || 
                                window.location.hostname === '127.0.0.1';
                
                if (!isSecure && isMacOS) {
                    console.warn('在macOS上，摄像头访问通常需要HTTPS连接');
                    gameState.setState({ debugInfo: '警告：非HTTPS连接可能无法访问摄像头' });
                }
                
                // 首先尝试使用现代API
                if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
                    console.log('使用现代mediaDevices API');
                    
                    // 在macOS上使用更简单的约束
                    const constraints = isMacOS ? 
                        { video: true } : 
                        { 
                            video: {
                                width: 320,
                                height: 240,
                                frameRate: { ideal: 30 }
                            } 
                        };
                    
                    const stream = await navigator.mediaDevices.getUserMedia(constraints);
                    video.srcObject = stream;
                    await video.play();
                    
                    // 继续初始化过程
                    await this.continueInit();
                    return;
                }
                
                // 如果现代API不可用，尝试旧版API
                console.log('现代API不可用，尝试旧版API');
                const getUserMedia = navigator.getUserMedia || 
                                    navigator.webkitGetUserMedia || 
                                    navigator.mozGetUserMedia || 
                                    navigator.msGetUserMedia;
                
                if (!getUserMedia) {
                    throw new Error('浏览器不支持摄像头访问，请使用最新版Chrome、Firefox或Edge浏览器');
                }
                
                // 在macOS上使用更简单的约束
                const constraints = isMacOS ? 
                    { video: true } : 
                    { 
                        video: {
                            width: 320,
                            height: 240,
                            frameRate: { ideal: 30 }
                        } 
                    };
                
                // 使用旧版API
                getUserMedia.call(navigator, 
                    constraints,
                    (stream) => {
                        video.srcObject = stream;
                        video.play().then(() => {
                            // 继续初始化过程
                            this.continueInit();
                        }).catch(err => {
                            console.error('视频播放失败:', err);
                            gameState.setState({ debugInfo: '视频播放失败: ' + err.message });
                        });
                    },
                    (err) => {
                        console.error('摄像头访问失败:', err);
                        gameState.setState({ debugInfo: '摄像头访问失败: ' + err.message });
                        
                        // 在macOS上提供更多指导
                        if (isMacOS) {
                            gameState.setState({ 
                                debugInfo: 'macOS摄像头访问失败: 请检查浏览器权限设置，并确保使用https或localhost' 
                            });
                        }
                    }
                );
            } catch (mediaError) {
                console.error('媒体访问错误:', mediaError);
                
                // 更详细的错误信息
                let errorMessage = '摄像头访问失败: ' + mediaError.message;
                if (mediaError.name === 'NotAllowedError' || mediaError.name === 'PermissionDeniedError') {
                    errorMessage = '摄像头访问被拒绝，请在浏览器中允许摄像头访问权限';
                } else if (mediaError.name === 'NotFoundError' || mediaError.name === 'DevicesNotFoundError') {
                    errorMessage = '未找到摄像头设备，请确保您的设备有摄像头并已正确连接';
                } else if (mediaError.name === 'NotReadableError' || mediaError.name === 'TrackStartError') {
                    errorMessage = '无法读取摄像头，可能被其他应用程序占用';
                } else if (mediaError.name === 'OverconstrainedError') {
                    errorMessage = '摄像头不支持请求的分辨率或帧率';
                } else if (mediaError.name === 'TypeError' && mediaError.message.includes('getUserMedia')) {
                    errorMessage = '浏览器不支持摄像头API或需要HTTPS连接';
                    
                    // 针对macOS的特殊提示
                    if (isMacOS) {
                        errorMessage += '。在macOS上，请确保使用https或localhost访问，并在系统偏好设置中允许浏览器访问摄像头';
                    }
                }
                
                gameState.setState({ debugInfo: errorMessage });
            }
        } catch (error) {
            console.error('游戏初始化失败:', error);
            gameState.setState({ debugInfo: '初始化失败: ' + error.message });
        }
    }
    
    async continueInit() {
        try {
            // 初始化姿势检测
            await poseDetector.init();
            
            // 开始姿势检测
            poseDetector.startDetection();
            
            // 开始游戏循环
            this.isRunning = true;
            this.animate();
            
            console.log('游戏初始化成功');
            gameState.setState({ debugInfo: '准备开始...' });
        } catch (error) {
            console.error('游戏初始化后续步骤失败:', error);
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
