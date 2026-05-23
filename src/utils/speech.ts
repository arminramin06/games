// Web Speech API interfaces for Speech Recognition
export interface SpeechRecognitionWindow extends Window {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  SpeechRecognition?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  webkitSpeechRecognition?: any;
}

const getSpeechRecognitionClass = () => {
  const customWindow = window as unknown as SpeechRecognitionWindow;
  return customWindow.SpeechRecognition || customWindow.webkitSpeechRecognition;
};

/**
 * Returns true if the browser supports Speech Recognition natively.
 */
export function isSpeechRecognitionSupported(): boolean {
  return typeof window !== 'undefined' && !!getSpeechRecognitionClass();
}

/**
 * Instantiates and returns a SpeechRecognition object, or null if unsupported.
 */
export function createSpeechRecognitionInstance() {
  const RecognitionClass = getSpeechRecognitionClass();
  if (!RecognitionClass) return null;
  
  const rec = new RecognitionClass();
  rec.continuous = true;   // Keep listening after each result
  rec.interimResults = false;
  rec.lang = 'en-US';
  return rec;
}

/**
 * Custom Speech Synthesis (browser announcer) speaker.
 */
export function speakText(text: string, pitch = 1.0, rate = 1.0) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return;
  }

  try {
    // Snappier feedback: cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.volume = 1.0;
    utterance.pitch = pitch;
    utterance.rate = rate;

    // Find a friendly English voice (preferring natural-sounding voices)
    const voices = window.speechSynthesis.getVoices();
    const engVoice = voices.find(
      (v) =>
        v.lang.startsWith('en') &&
        (v.name.includes('Google') ||
          v.name.includes('Samantha') ||
          v.name.includes('Natural') ||
          v.name.includes('Hazel'))
    );

    if (engVoice) {
      utterance.voice = engVoice;
    }

    window.speechSynthesis.speak(utterance);
  } catch (error) {
    console.warn('Speech synthesis failed:', error);
  }
}

// Caches voices in Chrome/Safari which load asynchronously
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices();
  };
}

/**
 * Pick a randomized fun turn announcer script and speak it.
 */
const turnScripts = [
  "{name}, it's your turn!",
  "{name}, name a country!",
  "{name}, search the globe!",
  "{name}, your move!",
  "{name}, find a country!"
];

export function announceTurn(playerName: string, pitch = 1.1, rate = 1.0) {
  const randomScript = turnScripts[Math.floor(Math.random() * turnScripts.length)];
  const announcement = randomScript.replace('{name}', playerName);
  speakText(announcement, pitch, rate);
}
