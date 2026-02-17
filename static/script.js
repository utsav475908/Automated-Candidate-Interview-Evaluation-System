let ws;

// --- Audio State ---
let ttsEnabled = true;
let isRecording = false;
let recognition = null;

// --- Setup Function ---
function startInterview() {
    const role = document.getElementById('jobRole').value;
    if (!role) return alert("Please enter a job role");

    // UI Transition
    document.getElementById('setup-screen').style.display = 'none';
    document.getElementById('chat-screen').style.display = 'flex';
    document.getElementById('role-display').innerText = role + " Interview";

    // Establish WebSocket Connection
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    ws = new WebSocket(`${protocol}://${window.location.host}/ws/interview?pos=${encodeURIComponent(role)}`);

    ws.onopen = function () {
        console.log("Connected to Interview Server");
    };

    ws.onmessage = function (event) {
        const data = event.data;

        // 1. Handle System Commands
        if (data.startsWith("SYSTEM_TURN:USER")) {
            enableInput(true);
            return;
        }
        if (data.startsWith("SYSTEM_INFO:")) {
            addSystemMessage(data.split(":")[1]);
            return;
        }
        if (data.startsWith("SYSTEM_END:")) {
            addSystemMessage("Interview Finished.");
            enableInput(false);
            document.getElementById('status').style.color = 'red';
            document.getElementById('status').innerText = '● Finished';
            ws.close();
            return;
        }

        // 2. Handle Chat Messages (Source:Content)
        const firstColon = data.indexOf(':');
        if (firstColon > -1) {
            const source = data.substring(0, firstColon);
            const content = data.substring(firstColon + 1);
            addMessage(source, content);
        }
    };

    ws.onclose = function () {
        document.getElementById('status').style.color = 'gray';
        document.getElementById('status').innerText = '● Disconnected';
    };
}

// --- Chat Functions ---

function addMessage(source, content) {
    // If source is 'Candidate', ignore it because we already rendered the user's message manually
    if (source === 'Candidate') return;

    const messagesDiv = document.getElementById('messages');
    const bubble = document.createElement('div');

    let type = 'interviewer';
    if (source === 'Evaluator') type = 'evaluator';

    bubble.className = `message ${type}`;

    const nameSpan = document.createElement('div');
    nameSpan.className = 'sender-name';
    nameSpan.innerText = source;

    const textSpan = document.createElement('div');
    textSpan.innerText = content;

    bubble.appendChild(nameSpan);
    bubble.appendChild(textSpan);
    messagesDiv.appendChild(bubble);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;

    // --- TTS: Speak AI messages aloud ---
    speakText(content, source);
}

function addSystemMessage(text) {
    const messagesDiv = document.getElementById('messages');
    const div = document.createElement('div');
    div.style.textAlign = 'center';
    div.style.color = '#9ca3af';
    div.style.fontSize = '0.8rem';
    div.style.margin = '10px 0';
    div.innerText = text;
    messagesDiv.appendChild(div);
}

function sendMsg() {
    const input = document.getElementById('msgInput');
    const text = input.value.trim();
    if (!text) return;

    // Render User Bubble
    const messagesDiv = document.getElementById('messages');
    const bubble = document.createElement('div');
    bubble.className = 'message user';
    bubble.innerText = text;
    messagesDiv.appendChild(bubble);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;

    // Send to backend
    ws.send(text);

    // Clear and lock input
    input.value = '';
    enableInput(false);
}

function enableInput(enabled) {
    const input = document.getElementById('msgInput');
    const micBtn = document.getElementById('micBtn');
    input.disabled = !enabled;
    micBtn.disabled = !enabled;
    if (enabled) input.focus();
}

// Handle 'Enter' key
document.getElementById('msgInput').addEventListener("keypress", function (event) {
    if (event.key === "Enter") sendMsg();
});


// =============================================
//  TEXT-TO-SPEECH (TTS)
// =============================================

function speakText(text, source) {
    if (!ttsEnabled) return;
    if (!('speechSynthesis' in window)) return;

    // Cancel any ongoing speech to prevent overlap
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 1.05;
    utterance.pitch = source === 'Evaluator' ? 1.15 : 1.0;

    // Try to pick a good voice
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
        // Prefer a natural-sounding English voice
        const preferred = voices.find(v => v.lang.startsWith('en') && v.name.includes('Samantha'))
            || voices.find(v => v.lang.startsWith('en') && v.name.includes('Google'))
            || voices.find(v => v.lang.startsWith('en') && !v.localService)
            || voices.find(v => v.lang.startsWith('en'));
        if (preferred) utterance.voice = preferred;
    }

    window.speechSynthesis.speak(utterance);
}

function toggleTTS() {
    ttsEnabled = !ttsEnabled;
    const onIcon = document.getElementById('ttsOnIcon');
    const offIcon = document.getElementById('ttsOffIcon');
    const btn = document.getElementById('ttsToggle');

    if (ttsEnabled) {
        onIcon.style.display = '';
        offIcon.style.display = 'none';
        btn.classList.remove('muted');
    } else {
        onIcon.style.display = 'none';
        offIcon.style.display = '';
        btn.classList.add('muted');
        window.speechSynthesis.cancel(); // Stop any current speech
    }
}

// Preload voices (some browsers load them asynchronously)
if ('speechSynthesis' in window) {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
}


// =============================================
//  SPEECH-TO-TEXT (STT)
// =============================================

function initRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        console.warn('Speech Recognition not supported in this browser.');
        alert('Speech Recognition is not supported in this browser. Please use Chrome or Edge.');
        return null;
    }

    const rec = new SpeechRecognition();
    rec.lang = 'en-US';
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;

    rec.onresult = function (event) {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
        }
        document.getElementById('msgInput').value = transcript;
    };

    rec.onerror = function (event) {
        console.error('Speech recognition error:', event.error);
        const micBtn = document.getElementById('micBtn');
        micBtn.classList.remove('recording');

        let errorMsg = 'Error: ' + event.error;
        if (event.error === 'not-allowed') {
            errorMsg = 'Microphone access denied. Please allow microphone permissions.';
            alert(errorMsg);
        } else if (event.error === 'no-speech') {
            // Ignore no-speech errors, just stop recording visual
            document.getElementById('msgInput').placeholder = 'No speech detected. Try again.';
            return;
        } else if (event.error === 'network') {
            errorMsg = 'Network error. Please check your connection.';
            alert(errorMsg);
        }

        document.getElementById('msgInput').placeholder = errorMsg;
        stopRecording();
    };

    rec.onend = function () {
        stopRecording();
    };

    return rec;
}

function toggleMic() {
    if (isRecording) {
        stopRecording();
    } else {
        startRecording();
    }
}

function startRecording() {
    // Cancel any ongoing TTS so the mic doesn't pick it up
    window.speechSynthesis.cancel();

    if (!recognition) {
        recognition = initRecognition();
    }
    if (!recognition) {
        alert('Speech recognition is not supported in your browser. Please use Chrome.');
        return;
    }

    isRecording = true;
    const micBtn = document.getElementById('micBtn');
    micBtn.classList.add('recording');
    document.getElementById('msgInput').placeholder = '🎙 Listening...';

    try {
        recognition.start();
    } catch (e) {
        console.error("Failed to start recognition:", e);
        // Already started or other issue
        stopRecording();
    }
}

function stopRecording() {
    isRecording = false;
    const micBtn = document.getElementById('micBtn');
    micBtn.classList.remove('recording');
    document.getElementById('msgInput').placeholder = 'Type or speak your answer...';

    if (recognition) {
        try { recognition.stop(); } catch (e) { /* ignore */ }
    }
}