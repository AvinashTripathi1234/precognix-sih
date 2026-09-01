import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom React Hook for browser-native Web Speech API voice transcription
 * Configured specifically for Indian rural/clinical contexts (hi-IN / en-IN).
 */
export function useSpeechRecognition() {
  const [isListening, setIsListening] = useState(false);
  const [activeField, setActiveField] = useState(null); // 'symptoms' | 'medicalHistory' | null
  const [language, setLanguage] = useState('hi-IN'); // 'hi-IN' | 'en-IN'
  const [error, setError] = useState(null);
  const [isSupported, setIsSupported] = useState(false);

  const recognitionRef = useRef(null);
  const callbackRef = useRef(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        setIsSupported(true);
      }
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore already stopped
      }
    }
    setIsListening(false);
    setActiveField(null);
  }, []);

  const startListening = useCallback(
    (fieldId, onTranscriptAppend, preferredLang) => {
      if (typeof window === 'undefined') return;

      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;

      if (!SpeechRecognition) {
        setError('Web Speech API is not supported in this browser.');
        return;
      }

      // If already listening on this field, toggle off
      if (isListening && activeField === fieldId) {
        stopListening();
        return;
      }

      // Stop any existing instance
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }

      setError(null);
      callbackRef.current = onTranscriptAppend;
      const targetLang = preferredLang || language;

      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = targetLang;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
          setIsListening(true);
          setActiveField(fieldId);
        };

        recognition.onresult = (event) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript + ' ';
            } else {
              interimTranscript += transcript;
            }
          }

          if (finalTranscript && callbackRef.current) {
            callbackRef.current(finalTranscript);
          }
        };

        recognition.onerror = (event) => {
          console.warn('⚠️ [Web Speech API Warning]:', event.error);
          if (event.error === 'not-allowed') {
            setError('Microphone access was denied. Please allow microphone permissions.');
            stopListening();
          } else if (event.error === 'no-speech') {
            // normal pause in speech
          } else {
            setError(`Voice recognition error: ${event.error}`);
          }
        };

        recognition.onend = () => {
          setIsListening(false);
          setActiveField(null);
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (err) {
        console.error('🔥 [Web Speech API Exception]:', err);
        setError('Could not initialize voice dictation.');
        setIsListening(false);
        setActiveField(null);
      }
    },
    [isListening, activeField, language, stopListening]
  );

  return {
    isSupported,
    isListening,
    activeField,
    language,
    setLanguage,
    error,
    startListening,
    stopListening,
  };
}

export default useSpeechRecognition;
