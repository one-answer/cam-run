// AI陪跑模块
import { GAME_CONFIG } from './config.js';
import { gameState } from './gameState.js';

class AICompanion {
    constructor() {
        this.config = {
            // 提示语类型
            promptTypes: ['Encouragement', 'Prank', 'Fun Facts', 'Challenge'],
            // 默认用户偏好
            defaultPreference: {
                favoriteTypes: ['Encouragement', 'Teasing'],
                frequency: 'Medium', // Low, Medium, High
                style: 'Humorous'
            },
            // 提示语显示时间(毫秒)
            displayDuration: 5000,
            // 提示语间隔时间范围(毫秒)
            intervalRange: {
                low: { min: 60000, max: 120000 },      // 低频率：1-2分钟
                medium: { min: 30000, max: 60000 },    // 中等频率：30秒-1分钟
                high: { min: 15000, max: 30000 }       // 高频率：15-30秒
            },
            // API 配置
            apiConfig: GAME_CONFIG.aiCompanion.apiConfig
        };

        // 用户偏好设置
        this.userPreference = {...this.config.defaultPreference};
        
        // 提示语计时器
        this.promptTimer = null;
        
        // 上次提示时间
        this.lastPromptTime = 0;
        
        // 提示语历史
        this.promptHistory = [];
        
        // 提示语DOM元素
        this.promptElement = null;
        
        // 是否已初始化
        this.initialized = false;
    }

    // 初始化
    init() {
        if (this.initialized) return;

        // 创建提示语DOM元素
        this.createPromptElement();
        
        // 加载用户偏好
        this.loadUserPreference();
        
        // 设置提示语计时器
        this.scheduleNextPrompt();
        
        // 监听用户开始跑步事件
        window.addEventListener('userStartedRunning', () => {
            // 用户开始跑步时，显示一个鼓励提示
            this.showEncouragementPrompt();
        });
        
        console.log('AI陪跑模块初始化完成');
        this.initialized = true;
    }

    // 创建提示语DOM元素
    createPromptElement() {
        // 检查是否已存在
        let promptElement = document.getElementById('ai-prompt');
        if (!promptElement) {
            // 创建新元素
            promptElement = document.createElement('div');
            promptElement.id = 'ai-prompt';
            promptElement.className = 'ai-prompt';
            document.body.appendChild(promptElement);
            
            // 添加样式
            const style = document.createElement('style');
            style.textContent = `
                .ai-prompt {
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    font-size: 2em;
                    color: white;
                    background-color: rgba(0, 0, 0, 0.7);
                    padding: 20px;
                    border-radius: 10px;
                    z-index: 1000;
                    display: none;
                    text-align: center;
                    max-width: 80%;
                    transition: opacity 0.5s ease-in-out;
                    opacity: 0;
                }
                
                @media screen and (max-width: 768px) {
                    .ai-prompt {
                        font-size: 1.5em;
                        padding: 15px;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        this.promptElement = promptElement;
    }

    // 加载用户偏好
    loadUserPreference() {
        // 尝试从localStorage加载用户偏好
        try {
            const savedPreference = localStorage.getItem('aiCompanionPreference');
            if (savedPreference) {
                this.userPreference = JSON.parse(savedPreference);
                //console.log('已加载用户偏好设置:', this.userPreference);
            }
        } catch (error) {
            console.error('加载用户偏好失败:', error);
        }
    }

    // 保存用户偏好 (public method)
    saveUserPreference() {
        const dialog = document.getElementById('ai-settings-dialog');
        const promptTypeCheckboxes = dialog.querySelectorAll('input[name="promptType"]:checked');
        const promptFrequencySelect = dialog.querySelector('#promptFrequency');
        const promptStyleSelect = dialog.querySelector('#promptStyle');

        // 获取选中的提示类型
        const selectedTypes = [];
        promptTypeCheckboxes.forEach(checkbox => {
            selectedTypes.push(checkbox.value);
        });

        // 确保至少选择了一种提示类型
        if (selectedTypes.length === 0) {
            alert('Please select at least one prompt type');
            return;
        }

        // 获取频率和风格
        const frequency = promptFrequencySelect.value;
        const style = promptStyleSelect.value;

        // 保存设置
        this.setUserPreference({
            favoriteTypes: selectedTypes,
            frequency: frequency,
            style: style
        });

        // 关闭对话框
        dialog.style.display = 'none';
    }

    // 设置用户偏好
    setUserPreference(preference) {
        // 确保频率设置有效
        const validFrequencies = ['Low', 'Medium', 'High'];
        if (preference.frequency && !validFrequencies.includes(preference.frequency)) {
            console.error('无效的频率设置，使用默认值');
            preference.frequency = this.userPreference.frequency;
        }
        
        this.userPreference = {...this.userPreference, ...preference};
        localStorage.setItem('aiCompanionPreference', JSON.stringify(this.userPreference));
        
        // 调试日志：打印当前频率设置
        console.log(`当前频率设置为：${this.userPreference.frequency}`);
        
        // 重新安排下一次提示
        this.scheduleNextPrompt();
    }

    // 显示设置对话框
    showSettingsDialog() {
        const dialog = document.getElementById('ai-settings-dialog');
        const promptTypeCheckboxes = dialog.querySelectorAll('input[name="promptType"]');
        const promptFrequencySelect = dialog.querySelector('#promptFrequency');
        const promptStyleSelect = dialog.querySelector('#promptStyle');

        // 设置提示类型复选框
        promptTypeCheckboxes.forEach(checkbox => {
            checkbox.checked = this.userPreference.favoriteTypes.includes(checkbox.value);
        });

        // 设置提示频率
        promptFrequencySelect.value = this.userPreference.frequency;

        // 设置提示风格
        promptStyleSelect.value = this.userPreference.style;

        // 显示对话框
        dialog.style.display = 'block';
    }

    // 获取跑步上下文
    getRunningContext() {
        const state = gameState.getState();
        return {
            speed: state.currentSpeed,
            distance: 0, // 目前没有距离数据
            time: performance.now() / 1000, // 转换为秒
            steps: state.stepCount,
            calories: state.caloriesBurned
        };
    }

    // 获取情绪状态
    getEmotionState(context) {
        if (context.speed < 2 && context.time > 60) {
            return 'Tired';
        } else if (context.speed > 4) {
            return 'Excited';
        } else {
            return 'Normal';
        }
    }

    // 生成随机间隔时间
    getRandomInterval() {
        // 将中文频率映射到英文配置键
        let frequencyKey;
        switch(this.userPreference.frequency) {
            case 'Low':
                frequencyKey = 'low';
                break;
            case 'High':
                frequencyKey = 'high';
                break;
            case 'Medium':
            default:
                frequencyKey = 'medium';
                break;
        }
        
        const range = this.config.intervalRange[frequencyKey] || this.config.intervalRange.medium;
        
        // 调试日志：打印当前频率和范围
        console.log(`当前频率：${this.userPreference.frequency}，范围：${JSON.stringify(range)}`);
        
        // 确保范围有效
        if (!range || typeof range.min !== 'number' || typeof range.max !== 'number') {
            console.error('无效的间隔范围，使用默认值');
            return 30000; // 默认30秒
        }
        
        // 确保min <= max
        const min = Math.min(range.min, range.max);
        const max = Math.max(range.min, range.max);
        
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // 安排下一次提示
    scheduleNextPrompt() {
        // 清除现有计时器
        if (this.promptTimer) {
            clearTimeout(this.promptTimer);
        }
        
        // 设置新计时器
        const interval = this.getRandomInterval();
        this.promptTimer = setTimeout(() => {
            this.checkAndShowPrompt();
        }, interval);
        
        console.log(`下一次提示将在${interval/1000}秒后显示`);
    }

    // 检查并显示提示
    async checkAndShowPrompt() {
        // 只有当用户正在跑步时才显示提示
        const state = gameState.getState();
        if (state.currentSpeed > 0) {
            // 获取跑步上下文
            const context = this.getRunningContext();
            const emotion = this.getEmotionState(context);
            
            // 生成提示语
            const prompt = await this.generatePrompt(context, emotion);
            
            // 显示提示语
            this.showPrompt(prompt);
        }
        
        // 安排下一次提示
        this.scheduleNextPrompt();
    }

    // 用户开始跑步时显示鼓励提示
    showEncouragementPrompt() {
        const encouragements = [
            "开始跑步了！加油！💪",
            "新的跑步旅程开始了，你可以的！🏃‍♂️",
            "准备好了吗？让我们一起跑起来！🔥",
            "今天是变得更强的好日子！💯",
            "开始了！保持节奏，享受跑步的乐趣！🌟"
        ];
        
        const randomIndex = Math.floor(Math.random() * encouragements.length);
        this.showPrompt(encouragements[randomIndex]);
    }

    // 显示提示语
    showPrompt(message) {
        if (!this.promptElement) return;
        
        // 记录提示历史
        this.promptHistory.push({
            time: Date.now(),
            message: message
        });
        
        // 只保留最近10条记录
        if (this.promptHistory.length > 10) {
            this.promptHistory.shift();
        }
        
        // 显示提示语
        this.promptElement.textContent = message;
        this.promptElement.style.display = 'block';
        
        // 使用淡入效果
        setTimeout(() => {
            this.promptElement.style.opacity = '1';
        }, 10);
        
        // 设置自动隐藏
        setTimeout(() => {
            // 淡出效果
            this.promptElement.style.opacity = '0';
            
            // 完全隐藏
            setTimeout(() => {
                this.promptElement.style.display = 'none';
            }, 500);
        }, this.config.displayDuration);
        
        // 更新最后提示时间
        this.lastPromptTime = Date.now();
    }

    // 生成提示语
    async generatePrompt(context, emotion) {
        console.log('generatePrompt:', this.config.apiConfig.url,context, emotion);
        // 如果配置了API，则调用API生成提示语
        if (this.config.apiConfig.url && this.config.apiConfig.apiKey) {
            try {
                return await this.callPromptAPI(context, emotion);
            } catch (error) {
                console.error('API调用失败，使用本地提示语:', error);
                return this.getLocalPrompt(context, emotion);
            }
        } else {
            // 否则使用本地提示语
            return this.getLocalPrompt(context, emotion);
        }
    }

    // 调用提示语API
    async callPromptAPI(context, emotion) {
        try {
            const response = await fetch(this.config.apiConfig.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.apiConfig.apiKey}`
                },
                body: JSON.stringify({
                    model: this.config.apiConfig.model,
                    messages: [{ 
                        role: "user", 
                        content: `根据以下跑步上下文和用户偏好生成一个个性化的提示语：
                        上下文：用户当前速度${context.speed}m/s，已跑${context.steps}步，消耗${context.calories}卡路里，情绪状态：${emotion}
                        用户偏好：喜欢的提示类型${this.userPreference.favoriteTypes.join('、')}，风格：${this.userPreference.style}
                        请生成一个简短、有趣、鼓舞人心的提示语，长度控制在10-20字。禁止任何解释解析。禁止重复/冗余内容。`
                    }]
                })
            });
            
            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status}`);
            }
            
            const data = await response.json();
            return data.choices[0].message.content;
        } catch (error) {
            console.error('API调用错误:', error);
            throw error;
        }
    }

    // 获取本地提示语
    getLocalPrompt(context, emotion) {
        // 根据用户偏好和上下文选择提示类型
        const availableTypes = this.userPreference.favoriteTypes.length > 0 ? 
                              this.userPreference.favoriteTypes : 
                              this.config.promptTypes;
        
        const randomTypeIndex = Math.floor(Math.random() * availableTypes.length);
        const promptType = availableTypes[randomTypeIndex];
        
        // 根据提示类型和情绪状态获取提示语
        let prompts = [];
        
        switch (promptType) {
            case 'Encouragement':
                if (emotion === 'Tired') {
                    prompts = [
                        "坚持住，休息是为了更好的坚持！💪",
                        "每一步都是胜利，继续加油！🌟",
                        "感到累很正常，但你比你想象的更强大！🔥",
                        "慢一点也没关系，重要的是不停下来！👣",
                        "呼吸，放松，然后继续前进！🌈"
                    ];
                } else if (emotion === 'Excited') {
                    prompts = [
                        "太棒了！你的状态简直完美！⚡",
                        "看看你的速度，简直是飞起来了！🚀",
                        "这种感觉真好，继续保持！🏆",
                        "你就是为跑步而生的！💯",
                        "这股能量太惊人了，继续释放它！✨"
                    ];
                } else {
                    prompts = [
                        "保持节奏，你做得很好！👍",
                        "每一步都让你更接近目标！🎯",
                        "感受身体的力量，你可以做到！💪",
                        "专注当下，享受跑步的乐趣！🌟",
                        "稳定呼吸，放松身体，继续前进！🏃‍♂️"
                    ];
                }
                break;
                
            case 'Prank':
                prompts = [
                    "想象身后有只老虎在追你...跑快点！🐯",
                    "你的鞋带好像松了...哈哈，骗你的！😜",
                    "左看右看，你是这条路上最帅的跑者！😎",
                    "跑得再快一点，我就告诉你一个秘密！🤫",
                    "你的跑步姿势像极了一只优雅的...企鹅？🐧"
                ];
                break;
                
            case 'Fun Facts':
                prompts = [
                    "你知道吗？跑步可以提高心血管健康！❤️",
                    "专业跑者的平均步频是每分钟160-170步！👣",
                    "跑步时呼吸可以帮助你放松！🌬️",
                    "跑步可以提高你的新陈代谢率！🔥",
                    "跑步可以让你更快乐！😊"
                ];
                break;
                
            case 'Challenge':
                prompts = [
                    "接下来30秒，试着加速冲刺一下！⚡",
                    "挑战：保持当前速度再跑1分钟！⏱️",
                    "数一数接下来20步，感受你的节奏！👣",
                    "深呼吸3次，然后试着加快步伐！🌬️",
                    "接下来10步，抬高你的膝盖！🦵"
                ];
                break;
                
            default:
                prompts = [
                    "继续前进，你做得很棒！👍",
                    "每一步都是胜利！🏆",
                    "感受节奏，享受跑步！🎵",
                    "你比昨天的自己更强大！💪",
                    "呼吸，放松，继续！🌈"
                ];
        }
        
        // 随机选择一条提示语
        const randomIndex = Math.floor(Math.random() * prompts.length);
        return prompts[randomIndex];
    }
}

export const aiCompanion = new AICompanion();
