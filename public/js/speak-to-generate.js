document.addEventListener('DOMContentLoaded', function() {
    const socket = io.connect('https://big-smart-society.glitch.me');

    socket.on('transcription', (transcribedText) => {
        document.getElementById('fromInput').innerText = transcribedText;
    });

    socket.on('transcriptionError', (error) => {
        console.error('Transcription error:', error);
        document.getElementById('fromInput').innerText = 'Error: ' + error.message;
    });

    let audioContext;
    let mediaStream;
    let isRecording = false;
    let audioWorkletNode;
    let audioDataBuffer = [];

    document.getElementById("recordButton").addEventListener('click', toggleRecording);

    function toggleRecording() {
    if (isRecording) {
        stopRecording();
    } else {
        startRecording();
    }
    }

    function startRecording() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Your browser does not support audio input');
        return;
    }

    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        .then(stream => {
        audioContext = new AudioContext();
        mediaStream = stream;

        audioContext.audioWorklet.addModule('js/audio-processor.js').then(() => {
            const mediaStreamSource = audioContext.createMediaStreamSource(stream);
            audioWorkletNode = new AudioWorkletNode(audioContext, 'audio-processor');

            mediaStreamSource.connect(audioWorkletNode);

            audioWorkletNode.port.onmessage = (event) => {
                processAudio(event.data);
            };

            updateUIForRecording(true);
        });
    })
    .catch(error => {
        console.error('Error accessing media devices.', error);
    });
    }

    function stopRecording() {

    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
    }
    if (audioContext) {
        audioContext.close();
    }
    if (audioWorkletNode) {
        audioWorkletNode.disconnect();
    }

    if (audioDataBuffer.length > 0) {
        const combinedData = combineAudioData(audioDataBuffer);
        const convertedData = convertTo16BitPCM(combinedData);
        socket.emit('audioData', convertedData);
        audioDataBuffer = [];
    }

    updateUIForRecording(false);
    }

    function processAudio(audioData) {

    audioDataBuffer.push(new Float32Array(audioData));

    }

    function combineAudioData(bufferArray) {

    let totalLength = bufferArray.reduce((acc, val) => acc + val.length, 0);
    let result = new Float32Array(totalLength);
    let offset = 0;
    for (let data of bufferArray) {
        result.set(data, offset);
        offset += data.length;
    }
    return result;

    }

    function convertTo16BitPCM(float32Array) {
    let pcmData = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
        const s = Math.max(-1, Math.min(1, float32Array[i]));
        pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return pcmData.buffer;
    }

    function updateUIForRecording(isRecordingNow) {
    const recordButton = document.getElementById('recordButton');
    const imgElement = recordButton.querySelector('img');

    if (isRecordingNow) {
        imgElement.src = '../Images/live-button-img.png';
        imgElement.alt = 'Stop Recording';
        isRecording = true;
    } else {
        imgElement.src = '../Images/record-button-img.jpg';
        imgElement.alt = 'Start Recording';
        isRecording = false;
    }
    }
});