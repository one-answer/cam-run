// 国际化支持模块
export const i18n = {
    // 当前语言
    currentLang: 'zh-CN',
    
    // 支持的语言
    supportedLangs: ['en-US', 'zh-CN'],
    
    // 翻译字典
    translations: {
        'en-US': {
            // 通用
            'app_title': 'Human Pose Detection Running Game',
            'loading': 'Loading...',
            'ready': 'Ready to start...',
            'getting_ready': 'Getting ready...',
            
            // 引导提示
            'guide_title': 'Get Ready',
            'guide_line1': 'Please stand in front of the camera and start running in place!',
            'guide_line2': 'The system will automatically detect your running motion',
            
            // 指示信息
            'instruction_title': 'Webcam Runner',
            'instruction_camera': 'Please grant camera access to the application.',
            'instruction_stand': 'Please stand in front of the camera and start running in place!',
            'instruction_detect': 'The system will automatically detect your running motion',
            
            // 游戏状态
            'game_status': 'Game Status (FPS: {fps})',
            'motion_quality': 'Motion Quality: {quality}',
            'current_speed': 'Current Speed: {speed} m/s',
            'steps': 'Steps: {steps}',
            'calories': 'Calories: {calories} kcal',
            'weight': 'Weight: {weight} kg',
            'debug_info': 'Debug Info: {debug}',
            'enter_weight_prompt': 'Enter your weight (kg), current weight: {default}kg',
            
            // 指标显示
            'speed_label': '🏃‍♂️ Speed: ',
            'steps_label': '👣 Steps: ',
            'calories_label': '🔥 Calories: ',
            'weight_label': '⚖️ Weight: ',
            
            // AI设置
            'ai_settings_title': 'AI Running Companion Settings',
            'prompt_type': 'Prompt Type:',
            'prompt_frequency': 'Prompt Frequency:',
            'prompt_style': 'Prompt Style:',
            'save_settings': 'Save Settings',
            'settings_saved': 'Settings saved! ✔️',
            
            // 提示类型
            'type_encouragement': 'Encouragement',
            'type_teasing': 'Teasing',
            'type_fun_facts': 'Fun Facts',
            'type_challenge': 'Challenge Tasks',
            
            // 频率
            'frequency_low': 'Low',
            'frequency_medium': 'Medium',
            'frequency_high': 'High',
            
            // 风格
            'style_humorous': 'Humorous',
            'style_serious': 'Serious',
            'style_motivational': 'Motivational',
            
            // 错误信息
            'camera_access_failed': 'Camera access failed: {message}',
            'camera_denied': 'Camera access denied, please allow camera access in browser settings',
            'no_camera': 'No camera device found, please ensure your device has a camera and is properly connected',
            'camera_busy': 'Unable to read camera, possibly occupied by another application',
            'camera_constraint': 'Camera does not support the requested resolution or frame rate',
            'browser_support': 'Browser does not support camera API or requires HTTPS connection',
            'macos_camera': 'On macOS, please ensure using https or localhost and allow browser camera access in system preferences',
            'init_failed': 'Initialization failed: {message}'
        },
        'zh-CN': {
            // 通用
            'app_title': '人体姿态识别跑步游戏',
            'loading': '加载中...',
            'ready': '准备开始...',
            'getting_ready': '准备中...',
            
            // 引导提示
            'guide_title': '准备就绪',
            'guide_line1': '请站在摄像头前开始原地跑步！',
            'guide_line2': '系统将自动检测您的跑步动作',
            
            // 指示信息
            'instruction_title': '网络摄像头跑步',
            'instruction_camera': '请允许应用程序访问摄像头。',
            'instruction_stand': '请站在摄像头前开始原地跑步！',
            'instruction_detect': '系统将自动检测您的跑步动作',
            
            // 游戏状态
            'game_status': '游戏状态 (FPS: {fps})',
            'motion_quality': '动作质量: {quality}',
            'current_speed': '当前速度: {speed} 米/秒',
            'steps': '步数: {steps}',
            'calories': '卡路里: {calories} 千卡',
            'weight': '体重: {weight} 公斤',
            'debug_info': '调试信息: {debug}',
            'enter_weight_prompt': '请输入您的体重（公斤），当前体重：{default}公斤',
            
            // 指标显示
            'speed_label': '🏃‍♂️ 速度: ',
            'steps_label': '👣 步数: ',
            'calories_label': '🔥 卡路里: ',
            'weight_label': '⚖️ 体重: ',
            
            // AI设置
            'ai_settings_title': 'AI跑步伙伴设置',
            'prompt_type': '提示类型:',
            'prompt_frequency': '提示频率:',
            'prompt_style': '提示风格:',
            'save_settings': '保存设置',
            'settings_saved': '设置已保存! ✔️',
            
            // 提示类型
            'type_encouragement': '鼓励',
            'type_teasing': '调侃',
            'type_fun_facts': '趣味知识',
            'type_challenge': '挑战任务',
            
            // 频率
            'frequency_low': '低',
            'frequency_medium': '中',
            'frequency_high': '高',
            
            // 风格
            'style_humorous': '幽默',
            'style_serious': '严肃',
            'style_motivational': '激励',
            
            // 错误信息
            'camera_access_failed': '摄像头访问失败: {message}',
            'camera_denied': '摄像头访问被拒绝，请在浏览器设置中允许摄像头访问',
            'no_camera': '未找到摄像头设备，请确保您的设备有摄像头并正确连接',
            'camera_busy': '无法读取摄像头，可能被其他应用程序占用',
            'camera_constraint': '摄像头不支持请求的分辨率或帧率',
            'browser_support': '浏览器不支持摄像头API或需要HTTPS连接',
            'macos_camera': '在macOS上，请确保使用https或localhost并在系统偏好设置中允许浏览器访问摄像头',
            'init_failed': '初始化失败: {message}'
        }
    },
    
    // 初始化
    init() {
        // 检测浏览器语言
        const browserLang = navigator.language || navigator.userLanguage;
        
        // 如果浏览器语言是支持的语言之一，使用它
        if (this.supportedLangs.includes(browserLang)) {
            this.currentLang = browserLang;
        } else if (browserLang.startsWith('zh')) {
            // 如果是中文的任何变种，使用中文
            this.currentLang = 'zh-CN';
        } else {
            // 默认使用英文
            this.currentLang = 'en-US';
        }
        
        // 设置HTML语言属性
        document.documentElement.lang = this.currentLang;
        
        // 初始化页面文本
        this.updatePageText();
        
        console.log(`Initialized i18n with language: ${this.currentLang}`);
    },
    
    // 切换语言
    setLanguage(lang) {
        if (this.supportedLangs.includes(lang)) {
            this.currentLang = lang;
            document.documentElement.lang = lang;
            this.updatePageText();
            return true;
        }
        return false;
    },
    
    // 获取翻译文本
    t(key, params = {}) {
        const translations = this.translations[this.currentLang] || this.translations['en-US'];
        let text = translations[key] || key;
        
        // 替换参数
        Object.keys(params).forEach(param => {
            text = text.replace(`{${param}}`, params[param]);
        });
        
        return text;
    },
    
    // 更新页面上的所有文本
    updatePageText() {
        // 更新标题
        document.title = this.t('app_title');
        
        // 更新引导提示
        const guidePrompt = document.getElementById('guide-prompt');
        if (guidePrompt) {
            const guideTitle = guidePrompt.querySelector('h3');
            const guideParagraphs = guidePrompt.querySelectorAll('p');
            
            if (guideTitle) guideTitle.textContent = this.t('guide_title');
            if (guideParagraphs.length >= 1) guideParagraphs[0].textContent = this.t('guide_line1');
            if (guideParagraphs.length >= 2) guideParagraphs[1].textContent = this.t('guide_line2');
        }
        
        // 更新指示信息
        const instructions = document.getElementById('instructions');
        if (instructions) {
            const instructionsTitle = instructions.querySelector('h2');
            const instructionsParagraphs = instructions.querySelectorAll('p');
            
            if (instructionsTitle) instructionsTitle.textContent = this.t('instruction_title');
            if (instructionsParagraphs.length >= 1) instructionsParagraphs[0].textContent = this.t('instruction_camera');
            if (instructionsParagraphs.length >= 2) instructionsParagraphs[1].textContent = this.t('instruction_stand');
            if (instructionsParagraphs.length >= 3) instructionsParagraphs[2].textContent = this.t('instruction_detect');
        }
        
        // 更新游戏状态标签
        const gameStatus = document.getElementById('gameStatus');
        if (gameStatus) {
            const labels = gameStatus.querySelectorAll('span');
            const textNodes = Array.from(gameStatus.childNodes).filter(node => node.nodeType === Node.TEXT_NODE);
            
            if (textNodes.length >= 1) textNodes[0].textContent = this.t('game_status', {fps: ''}).replace('(FPS: )', '(FPS: ');
            if (textNodes.length >= 2) textNodes[1].textContent = this.t('motion_quality', {quality: ''}).replace(': ', ': ');
            if (textNodes.length >= 3) textNodes[2].textContent = this.t('current_speed', {speed: ''}).replace(': 0.0 m/s', ': ');
            if (textNodes.length >= 4) textNodes[3].textContent = this.t('steps', {steps: ''}).replace(': ', ': ');
            if (textNodes.length >= 5) textNodes[4].textContent = this.t('calories', {calories: ''}).replace(': 0.0', ': ');
            if (textNodes.length >= 6) textNodes[5].textContent = this.t('weight', {weight: ''}).replace(': 60', ': ');
            if (textNodes.length >= 7) textNodes[6].textContent = this.t('debug_info', {debug: ''}).replace(': ', ': ');
        }
        
        // 更新指标显示
        const metricsDisplay = document.getElementById('metrics-display');
        if (metricsDisplay) {
            const divs = metricsDisplay.querySelectorAll('div');
            
            if (divs.length >= 1) {
                const spans = divs[0].querySelectorAll('span');
                if (spans.length >= 1) spans[0].textContent = this.t('speed_label');
            }
            
            if (divs.length >= 2) {
                const spans = divs[1].querySelectorAll('span');
                if (spans.length >= 1) spans[0].textContent = this.t('steps_label');
            }
            
            if (divs.length >= 3) {
                const spans = divs[2].querySelectorAll('span');
                if (spans.length >= 1) spans[0].textContent = this.t('calories_label');
                const textNodes = Array.from(divs[2].childNodes).filter(node => node.nodeType === Node.TEXT_NODE);
                if (textNodes.length > 0) textNodes[textNodes.length - 1].textContent = ' kcal';
            }
            
            if (divs.length >= 4) {
                const spans = divs[3].querySelectorAll('span');
                if (spans.length >= 1) spans[0].textContent = this.t('weight_label');
                const textNodes = Array.from(divs[3].childNodes).filter(node => node.nodeType === Node.TEXT_NODE);
                if (textNodes.length > 0) textNodes[textNodes.length - 1].textContent = ' kg';
            }
        }
        
        // 更新AI设置对话框
        const aiSettingsDialog = document.getElementById('ai-settings-dialog');
        if (aiSettingsDialog) {
            const title = aiSettingsDialog.querySelector('.modal-header h3');
            if (title) title.textContent = this.t('ai_settings_title');
            
            const labels = aiSettingsDialog.querySelectorAll('label');
            labels.forEach(label => {
                if (label.textContent.includes('Prompt Type:')) {
                    label.textContent = this.t('prompt_type');
                } else if (label.textContent.includes('Prompt Frequency:')) {
                    label.textContent = this.t('prompt_frequency');
                } else if (label.textContent.includes('Prompt Style:')) {
                    label.textContent = this.t('prompt_style');
                } else if (label.textContent.includes('Encouragement')) {
                    const input = label.querySelector('input');
                    if (input) label.textContent = this.t('type_encouragement');
                    label.appendChild(input);
                } else if (label.textContent.includes('Teasing')) {
                    const input = label.querySelector('input');
                    if (input) label.textContent = this.t('type_teasing');
                    label.appendChild(input);
                } else if (label.textContent.includes('Fun Facts')) {
                    const input = label.querySelector('input');
                    if (input) label.textContent = this.t('type_fun_facts');
                    label.appendChild(input);
                } else if (label.textContent.includes('Challenge Tasks')) {
                    const input = label.querySelector('input');
                    if (input) label.textContent = this.t('type_challenge');
                    label.appendChild(input);
                }
            });
            
            // 更新频率选项
            const frequencySelect = document.getElementById('promptFrequency');
            if (frequencySelect) {
                const options = frequencySelect.querySelectorAll('option');
                options.forEach(option => {
                    if (option.value === 'Low') {
                        option.textContent = this.t('frequency_low');
                    } else if (option.value === 'Medium') {
                        option.textContent = this.t('frequency_medium');
                    } else if (option.value === 'High') {
                        option.textContent = this.t('frequency_high');
                    }
                });
            }
            
            // 更新风格选项
            const styleSelect = document.getElementById('promptStyle');
            if (styleSelect) {
                const options = styleSelect.querySelectorAll('option');
                options.forEach(option => {
                    if (option.value === 'Humorous') {
                        option.textContent = this.t('style_humorous');
                    } else if (option.value === 'Serious') {
                        option.textContent = this.t('style_serious');
                    } else if (option.value === 'Motivational') {
                        option.textContent = this.t('style_motivational');
                    }
                });
            }
            
            // 更新保存按钮
            const saveButton = document.getElementById('save-ai-settings');
            if (saveButton) {
                saveButton.textContent = this.t('save_settings');
            }
        }
    }
};
