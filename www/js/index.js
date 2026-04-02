document.addEventListener('deviceready', onDeviceReady, false);

// Global State
const API_URL = 'http://192.168.0.4:3000/api';
let currentUser = null;
let isListening = false;
let token = null;

function onDeviceReady() {
    console.log('Tera System Initialized');
    initApp();
}

// Global Error Handling (Learning from errors)
window.onerror = function(message, source, lineno, colno, error) {
    const errorData = {
        error_msg: message,
        context: `Source: ${source}, Line: ${lineno}, Col: ${colno}, Stack: ${error ? error.stack : 'N/A'}`
    };
    console.error("Tera Error Detected:", errorData);
    
    if (token) {
        fetch(`${API_URL}/errors`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(errorData)
        });
    }
    return false;
};

function initApp() {
    // UI Elements
    const authScreen = document.getElementById('auth-screen');
    const mainScreen = document.getElementById('main-screen');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const switchToSignup = document.getElementById('switch-to-signup');
    const switchToLogin = document.getElementById('switch-to-login');
    const btnLogin = document.getElementById('btn-login');
    const btnQuickLogin = document.getElementById('btn-quick-login');
    const btnSignup = document.getElementById('btn-signup');
    const navItems = document.querySelectorAll('.nav-item');
    const modules = document.querySelectorAll('.module');
    const currentTimeDisplay = document.getElementById('current-time');
    const userInput = document.getElementById('user-input');
    const btnSend = document.getElementById('btn-send');
    const btnMic = document.getElementById('btn-mic');
    const chatMessages = document.getElementById('chat-messages');

    // Check for saved session
    const savedToken = localStorage.getItem('tera_token');
    const savedName = localStorage.getItem('tera_user');
    if (savedToken && savedName) {
        token = savedToken;
        login(savedName, true); // True means auto-login, less talking
    }

    // Time Update
    setInterval(() => {
        const now = new Date();
        currentTimeDisplay.textContent = now.toLocaleTimeString();
    }, 1000);

    // Auth Transitions
    switchToSignup.addEventListener('click', () => {
        loginForm.style.display = 'none';
        signupForm.style.display = 'block';
    });

    switchToLogin.addEventListener('click', () => {
        signupForm.style.display = 'none';
        loginForm.style.display = 'block';
    });

    // Quick Login
    btnQuickLogin.addEventListener('click', () => {
        document.getElementById('login-name').value = 'Admin';
        document.getElementById('login-password').value = '123456';
        btnLogin.click();
    });

    // Real Login/Signup with Backend
    btnLogin.addEventListener('click', async (e) => {
        e.preventDefault();
        const name = document.getElementById('login-name').value;
        const password = document.getElementById('login-password').value;

        if (!name || !password) {
            teraSpeak("Por favor, preencha todos os campos.");
            return;
        }

        try {
            addMessage("Autenticando...", 'system');
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, password })
            });

            const data = await response.json();
            if (response.ok) {
                token = data.token;
                localStorage.setItem('tera_token', token);
                localStorage.setItem('tera_user', data.user.name);
                login(data.user.name);
            } else {
                teraSpeak(data.error || "Falha na autenticação.");
                addMessage(data.error || "Erro de login.", 'system');
            }
        } catch (error) {
            console.error("Login error:", error);
            teraSpeak("Erro de conexão. Iniciando modo offline local.");
            login(name || "Usuário Local"); // Fallback for testing
        }
    });

    btnSignup.addEventListener('click', async (e) => {
        e.preventDefault();
        const name = document.getElementById('signup-name').value;
        const password = document.getElementById('signup-password').value;

        if (!name || !password) {
            teraSpeak("Nome e senha são obrigatórios para o cadastro.");
            return;
        }

        try {
            const response = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, password })
            });

            const data = await response.json();
            if (response.ok) {
                teraSpeak(`Acesso concedido, ${name}. Por favor, identifique-se.`);
                switchToLogin.click();
            } else {
                teraSpeak(data.error || "Erro no cadastro.");
            }
        } catch (error) {
            teraSpeak("Não foi possível conectar ao servidor central.");
        }
    });

    function login(name, isAuto = false) {
        currentUser = name;
        document.getElementById('user-display').textContent = `BEM-VINDO, ${name.toUpperCase()}`;
        
        // Immediate UI Switch
        authScreen.classList.remove('active');
        mainScreen.classList.add('active');
        
        if (!isAuto) {
            teraSpeak(`Protocolos iniciados. Sistema Tera online. Como posso ajudá-lo hoje, ${name}?`);
            addMessage(`Bem-vindo, ${name}. Sistema online.`, 'system');
        } else {
            addMessage(`Sessão restaurada para ${name}.`, 'system');
        }
    }

    // Navigation
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const target = item.getAttribute('data-target');
            navItems.forEach(nav => nav.classList.remove('active'));
            modules.forEach(mod => mod.classList.remove('active'));
            item.classList.add('active');
            document.getElementById(target).classList.add('active');
            loadModuleData(target);
        });
    });

    // Chat Logic
    btnSend.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    function sendMessage() {
        const text = userInput.value.trim();
        if (!text) return;
        addMessage(text, 'user');
        userInput.value = '';
        processCommand(text);
    }

    function addMessage(text, sender) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${sender}`;
        msgDiv.textContent = (sender === 'system' ? 'Tera: ' : '') + text;
        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // AI Logic (Humanized)
    function processCommand(text) {
        const input = text.toLowerCase();
        let response = "";

        if (input.includes("estudo") || input.includes("matéria")) {
            response = "Estou acessando seu cronograma de estudos. Você tem revisões pendentes em Cálculo e Física Quântica. Deseja que eu prepare um resumo?";
            showModule('study-module');
        } else if (input.includes("laudo") || input.includes("relatório")) {
            response = "Módulo de engenharia ativado. Estou recuperando os laudos técnicos dos aplicativos em desenvolvimento. Um momento.";
            showModule('reports-module');
        } else if (input.includes("projeto")) {
            response = "Aqui estão as listagens de projetos futuros que você me pediu para monitorar.";
            showModule('projects-module');
        } else if (input.includes("técnico") || input.includes("serviço")) {
            response = "Diagnosticando sistemas... Sensores de rede indicam estabilidade. Deseja agendar uma manutenção preventiva?";
            showModule('tech-module');
        } else if (input.includes("quem é você")) {
            response = "Eu sou Tera, sua inteligência artificial de suporte total. Pense em mim como sua assistente pessoal para tudo o que envolve tecnologia, estudos e gestão de projetos.";
        } else if (input.includes("erro") || input.includes("problema")) {
            response = "Estou sempre aprendendo com as falhas do sistema para garantir que não ocorram novamente. Minha base de dados de erros foi atualizada.";
        } else {
            response = "Comando reconhecido. Vou pesquisar em meus arquivos técnicos e retornar com a melhor solução em instantes.";
        }

        setTimeout(() => {
            addMessage(response, 'system');
            teraSpeak(response);
        }, 500);
    }

    function showModule(moduleId) {
        navItems.forEach(nav => nav.classList.remove('active'));
        modules.forEach(mod => mod.classList.remove('active'));
        const navItem = document.querySelector(`[data-target="${moduleId}"]`);
        if (navItem) navItem.classList.add('active');
        document.getElementById(moduleId).classList.add('active');
        loadModuleData(moduleId);
    }

    // Voice Synthesis (TTS)
    function teraSpeak(text) {
        const visualizer = document.querySelector('.tera-avatar');
        if (visualizer) visualizer.classList.add('speaking');

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'pt-BR';
        utterance.pitch = 1.1; 
        utterance.rate = 1;

        utterance.onend = () => {
            if (visualizer) visualizer.classList.remove('speaking');
        };

        window.speechSynthesis.speak(utterance);
    }

    // Voice Recognition (STT)
    if ('webkitSpeechRecognition' in window) {
        const recognition = new webkitSpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'pt-BR';

        recognition.onstart = () => {
            isListening = true;
            btnMic.style.background = 'var(--primary-color)';
            btnMic.style.color = 'var(--bg-dark)';
            addMessage("Ouvindo...", 'system');
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            userInput.value = transcript;
            sendMessage();
        };

        recognition.onend = () => {
            isListening = false;
            btnMic.style.background = 'transparent';
            btnMic.style.color = 'var(--primary-color)';
        };

        btnMic.addEventListener('click', () => {
            if (isListening) recognition.stop();
            else recognition.start();
        });
    }

    // Dynamic Module Data
    function loadModuleData(moduleId) {
        const contentMap = {
            'study-module': `
                <div class="card"><h3>Cálculo III</h3><p>Derivadas Parciais e Integrais Múltiplas</p></div>
                <div class="card"><h3>Sistemas Operacionais</h3><p>Gerenciamento de Memória e Processos</p></div>
                <div class="card"><h3>Inteligência Artificial</h3><p>Redes Neurais e Machine Learning</p></div>
            `,
            'tech-module': `
                <div class="card"><h3>Servidor AWS</h3><p>Status: Operacional (99.9% Uptime)</p></div>
                <div class="card"><h3>Banco de Dados MySQL</h3><p>Sincronizado com GitHub Actions</p></div>
                <div class="card"><h3>API Gateway</h3><p>Latência: 45ms</p></div>
            `,
            'reports-module': `
                <div class="card"><h3>Laudo_Seguranca_Web.pdf</h3><p>Vulnerabilidades corrigidas: 12</p></div>
                <div class="card"><h3>Performance_App_Mobile.docx</h3><p>Otimização de 30% no carregamento</p></div>
                <div class="card"><h3>Relatorio_Infraestrutura.pdf</h3><p>Data: 02/04/2026</p></div>
            `,
            'projects-module': `
                <div class="card"><h3>Tera v2.0</h3><p>Implementação de Visão Computacional</p><div class="github-badge">github.com/tera/v2</div></div>
                <div class="card"><h3>Home Automation Kit</h3><p>Integração com sensores IoT</p><div class="github-badge">github.com/tera/home-iot</div></div>
                <div class="card"><h3>Study Hub Platform</h3><p>Portal acadêmico centralizado</p><div class="github-badge">github.com/tera/study-hub</div></div>
            `
        };

        const gridId = moduleId.replace('-module', '') + (moduleId.includes('grid') ? '-grid' : '-list');
        const element = document.getElementById(gridId) || document.getElementById(moduleId.replace('-module', '-grid')) || document.getElementById(moduleId.replace('-module', '-list'));
        
        if (element && contentMap[moduleId]) {
            element.innerHTML = contentMap[moduleId];
        }
    }
}
