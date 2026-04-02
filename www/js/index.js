document.addEventListener('deviceready', onDeviceReady, false);

// Global State
let API_URL = localStorage.getItem('tera_api_url') || 'http://192.168.0.4:41289/api';
let currentUser = null;
let isListening = false;
let token = localStorage.getItem('tera_token') || null;

function onDeviceReady() {
    console.log('Tera System Initialized on API:', API_URL);
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
    const ipConfigPanel = document.getElementById('ip-config-panel');
    const btnConfigIp = document.getElementById('btn-config-ip');
    const btnSaveIp = document.getElementById('btn-save-ip');
    const btnCancelIp = document.getElementById('btn-cancel-ip');
    const inputServerIp = document.getElementById('input-server-ip');

    // Set initial input value
    inputServerIp.value = API_URL.replace('http://', '').replace('/api', '');

    // IP Config Logic
    btnConfigIp.addEventListener('click', () => {
        loginForm.style.display = 'none';
        signupForm.style.display = 'none';
        ipConfigPanel.style.display = 'block';
    });

    btnCancelIp.addEventListener('click', () => {
        ipConfigPanel.style.display = 'none';
        loginForm.style.display = 'block';
    });

    btnSaveIp.addEventListener('click', () => {
        const newIp = inputServerIp.value.trim();
        if (newIp) {
            API_URL = `http://${newIp}/api`;
            localStorage.setItem('tera_api_url', API_URL);
            alert("Endereço atualizado: " + API_URL + ". Reiniciando protocolos...");
            location.reload();
        }
    });

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
    const savedName = localStorage.getItem('tera_user');
    if (token && savedName) {
        login(savedName, true);
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
            const currentApi = localStorage.getItem('tera_api_url') || API_URL;
            addMessage(`Tentando conexão em: ${currentApi}`, 'system');
            
            const response = await fetch(`${currentApi}/login`, {
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
                const errorMsg = data.error || "Falha na autenticação.";
                teraSpeak(errorMsg);
                alert("Tera: " + errorMsg);
                addMessage(errorMsg, 'system');
            }
        } catch (error) {
            console.error("Login connection error:", error);
            const currentApi = localStorage.getItem('tera_api_url') || API_URL;
            alert(`ERRO DE CONEXÃO!\nServidor: ${currentApi}\n\n1. Verifique se o servidor está rodando no PC.\n2. Verifique se o celular está no mesmo Wi-Fi.\n3. O IP do seu PC pode ter mudado.`);
            
            const offlineConfirm = confirm("Deseja entrar em MODO OFFLINE local para testar a interface?");
            if (offlineConfirm) {
                login(name || "Usuário Local", false);
            }
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
        } else if (input.includes("pesquisa") || input.includes("o que é") || input.includes("quem foi") || input.includes("buscar")) {
            const query = text.replace(/pesquisa|o que é|quem foi|buscar/gi, "").trim();
            response = query ? `Iniciando pesquisa profunda sobre ${query}. Analisando fontes...` : "Módulo de pesquisa ativado. O que o senhor deseja que eu investigue?";
            showModule('research-module');
            if (query) performResearch(query);
        } else if (input.includes("lembrete") || input.includes("agendar") || input.includes("tarefa") || input.includes("diário")) {
            response = "Módulo de atividades diárias online. Listando seus compromissos e lembretes.";
            showModule('daily-module');
        } else if (input.includes("clima") || input.includes("tempo")) {
            response = "Sensores indicam 24 graus com céu limpo. Uma ótima tarde para produtividade.";
        } else if (input.includes("hora") || input.includes("dia")) {
            const now = new Date();
            response = `Agora são ${now.getHours()} horas e ${now.getMinutes()} minutos do dia ${now.toLocaleDateString()}.`;
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

    // Daily Tasks Logic
    const btnAddTask = document.getElementById('btn-add-task');
    const newTaskInput = document.getElementById('new-task');
    const dailyList = document.getElementById('daily-list');

    btnAddTask.addEventListener('click', () => {
        const task = newTaskInput.value.trim();
        if (task) {
            addTask(task);
            newTaskInput.value = '';
        }
    });

    function addTask(text) {
        const div = document.createElement('div');
        div.className = 'task-item';
        div.innerHTML = `
            <span>${text}</span>
            <span class="remove-btn">×</span>
        `;
        div.querySelector('.remove-btn').addEventListener('click', () => div.remove());
        dailyList.appendChild(div);
    }

    // Research Logic
    const btnDoSearch = document.getElementById('btn-do-search');
    const searchQueryInput = document.getElementById('search-query');
    const searchResults = document.getElementById('search-results');

    btnDoSearch.addEventListener('click', () => {
        const query = searchQueryInput.value.trim();
        if (query) performResearch(query);
    });

    function performResearch(query) {
        searchResults.innerHTML = `<p class="placeholder-text">Pesquisando por: ${query}...</p>`;
        
        // Mocking research results
        setTimeout(() => {
            searchResults.innerHTML = `
                <div class="search-result-card">
                    <h3>Resultado da Web para "${query}"</h3>
                    <p>Encontrei informações relevantes nos meus bancos de dados. Segundo as fontes técnicas, ${query} refere-se a um conceito fundamental no seu campo de atuação.</p>
                </div>
                <div class="search-result-card">
                    <h3>Documentação Relacionada</h3>
                    <p>Existem 12 artigos técnicos e 3 laudos que mencionam ${query}. Deseja que eu resuma o mais recente?</p>
                </div>
            `;
            teraSpeak(`Pesquisa concluída para ${query}. Os resultados principais estão na tela.`);
        }, 1500);
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
    async function loadModuleData(moduleId) {
        if (moduleId === 'projects-module') {
            const list = document.getElementById('projects-list');
            list.innerHTML = '<p class="placeholder-text">Sincronizando com GitHub...</p>';
            
            try {
                const currentApi = localStorage.getItem('tera_api_url') || API_URL;
                const response = await fetch(`${currentApi}/projects`);
                const projects = await response.ok ? await response.json() : [];
                
                if (projects.length > 0) {
                    list.innerHTML = projects.map(p => `
                        <div class="card" onclick="window.open('${p.url || '#'}', '_system')">
                            <h3>${p.title}</h3>
                            <p>${p.description}</p>
                            <div class="card-footer">
                                ${p.language && p.language !== 'N/A' ? `<span class="github-badge"><i>💻</i> ${p.language}</span>` : ''}
                                ${p.category === 'github' ? `<span class="github-badge"><i>🔗</i> GitHub</span>` : ''}
                            </div>
                        </div>
                    `).join('');
                } else {
                    list.innerHTML = `
                        <div class="error-container">
                            <p class="placeholder-text">Não foi possível carregar via API.</p>
                            <button class="btn-tech" onclick="window.open('https://github.com/lzvsrx', '_system')">VER NO GITHUB WEB</button>
                        </div>
                    `;
                }
            } catch (e) {
                list.innerHTML = `
                    <div class="error-container">
                        <p class="placeholder-text">Erro de conexão com o servidor.</p>
                        <button class="btn-tech" onclick="window.open('https://github.com/lzvsrx', '_system')">ACESSAR GITHUB MANUALMENTE</button>
                    </div>
                `;
            }
            return;
        }

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
            `
        };

        const gridId = moduleId.replace('-module', '') + (moduleId.includes('grid') ? '-grid' : '-list');
        const element = document.getElementById(gridId) || document.getElementById(moduleId.replace('-module', '-grid')) || document.getElementById(moduleId.replace('-module', '-list'));
        
        if (element && contentMap[moduleId]) {
            element.innerHTML = contentMap[moduleId];
        }
    }
}
