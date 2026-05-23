let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    // Standard and vendor prefixed support
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  
  return audioCtx;
}

/**
 * Play a retro success chime (ascending major chord).
 */
export function playSuccess() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // Notes: C5, E5, G5, C6
    const freqs = [523.25, 659.25, 783.99, 1046.50];
    const duration = 0.15;
    const spacing = 0.08;

    freqs.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'triangle'; // pleasant, retro chiptune character
      osc.frequency.setValueAtTime(freq, now + index * spacing);
      
      gain.gain.setValueAtTime(0, now + index * spacing);
      gain.gain.linearRampToValueAtTime(0.2, now + index * spacing + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + index * spacing + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now + index * spacing);
      osc.stop(now + index * spacing + duration);
    });
  } catch (error) {
    console.warn('Audio feedback failed:', error);
  }
}

/**
 * Play a low failure buzzer sound (buzzing frequency slide downwards).
 */
export function playFailure() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const duration = 0.45;

    // Use two oscillators for a thick, rich buzzing sound
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc1.type = 'sawtooth';
    osc2.type = 'square';
    
    // Low frequency slide
    osc1.frequency.setValueAtTime(160, now);
    osc1.frequency.linearRampToValueAtTime(70, now + duration);
    
    // Slightly detune second oscillator for a chorus buzz effect
    osc2.frequency.setValueAtTime(162, now);
    osc2.frequency.linearRampToValueAtTime(72, now + duration);

    // Setup filter to make it warmer/buzzier and less piercing
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, now);
    filter.frequency.exponentialRampToValueAtTime(100, now + duration);

    // Volume envelope
    gainNode.gain.setValueAtTime(0.01, now);
    gainNode.gain.linearRampToValueAtTime(0.25, now + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + duration);
    osc2.stop(now + duration);
  } catch (error) {
    console.warn('Audio feedback failed:', error);
  }
}

/**
 * Play a celebratory fanfare for the winner.
 */
export function playWinner() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // Chord progression: C4-E4-G4 -> F4-A4-C5 -> G4-B4-D5 -> C5-E5-G5-C6
    const chords = [
      [261.63, 329.63, 392.00], // C4 major
      [349.23, 440.00, 523.25], // F4 major
      [392.00, 493.88, 587.33], // G4 major
      [523.25, 659.25, 783.99, 1046.50] // C5 major (high)
    ];
    
    const chordDuration = 0.25;
    const chordSpacing = 0.25;

    chords.forEach((chord, chordIdx) => {
      chord.forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = chordIdx === 3 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, now + chordIdx * chordSpacing);
        
        // Tremolo for the final chord
        if (chordIdx === 3) {
          osc.frequency.setValueAtTime(freq, now + chordIdx * chordSpacing);
          // slight vibrato
          const vibrato = ctx.createOscillator();
          const vibratoGain = ctx.createGain();
          vibrato.frequency.value = 8; // 8 Hz vibrato
          vibratoGain.gain.value = 5; // 5 Hz detune depth
          vibrato.connect(vibratoGain);
          vibratoGain.connect(osc.frequency);
          vibrato.start(now + chordIdx * chordSpacing);
          vibrato.stop(now + chordIdx * chordSpacing + chordDuration * 2.5);
        }

        gain.gain.setValueAtTime(0, now + chordIdx * chordSpacing);
        gain.gain.linearRampToValueAtTime(0.15, now + chordIdx * chordSpacing + 0.02);
        gain.gain.exponentialRampToValueAtTime(
          0.001, 
          now + chordIdx * chordSpacing + (chordIdx === 3 ? chordDuration * 2.5 : chordDuration)
        );
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(now + chordIdx * chordSpacing);
        osc.stop(now + chordIdx * chordSpacing + (chordIdx === 3 ? chordDuration * 2.5 : chordDuration));
      });
    });
  } catch (error) {
    console.warn('Audio feedback failed:', error);
  }
}
