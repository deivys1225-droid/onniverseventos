import { FormEvent, useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Mic, MicOff, Send, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import OnniAvatarDots from "@/components/OnniAvatarDots";
import HomeSocialRedesRow from "@/components/HomeSocialRedesRow";
import { getOnniIntroduction } from "@/data/onniBrain";
import { toast } from "sonner";
import { getOpAssistantHint, resolveOpCommand } from "@/lib/opAssistantResolver";
import { dispatchOpCommand } from "@/lib/opCommandBus";
import { invokeOpenGalleryDirect } from "@/lib/galleryOpenDirect";
import { publishOnniAulaKnowledge } from "@/lib/onniAulaKnowledgeBoard";
import { extractWikipediaTopic, fetchWikipediaSummary } from "@/lib/wikipediaSummary";
import {
  getHomeSocialUrl,
  loadHomeSocialRedesConfig,
  type HomeSocialIconId,
} from "@/lib/homeSocialRedesConfig";
import { openHomeSocialRedes } from "@/lib/homeSocialRedesOpen";
import { askOnniGemini, isOnniNavigationResult } from "@/lib/onniGemini";
import { shouldShowNativeVoiceError } from "@/lib/onniNativeVoiceErrors";
import OpAiAndroidAzureMic from "@/components/OpAiAndroidAzureMic";
import { useOnniChatVoice } from "@/hooks/useOnniChatVoice";
import { useOnniVoice } from "@/hooks/useOnniVoice";
import { isDesktopWebBrowser, isOnniAndroidVoice } from "@/lib/deviceDetection";
import { isAzureMicSupported } from "@/lib/onniAzureStt";
import { onniMicDeniedMessage, requestOnniMicrophoneAccess } from "@/lib/requestOnniMicrophone";
import type { OnniSpeakOptions } from "@/lib/onniVoiceRuntime";

type UiMessage = { role: "user" | "assistant"; text: string };

function isEditableKeyboardTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return target.isContentEditable;
}

function isOnniResolverFallback(answer: string): boolean {
  return /\bno pill[eé]\b/i.test(answer);
}

function appendAssistantAnswer(
  setMessages: Dispatch<SetStateAction<UiMessage[]>>,
  sessionRef: MutableRefObject<{ lastAnswer?: string; lastAnswerFromGemini?: boolean }>,
  answer: string,
  speak: (text: string, options?: OnniSpeakOptions) => void,
  speakOptions?: OnniSpeakOptions,
) {
  sessionRef.current.lastAnswer = answer;
  sessionRef.current.lastAnswerFromGemini = speakOptions?.fromGemini ?? false;
  setMessages((prev) => [...prev, { role: "assistant", text: answer }]);
  speak(answer, speakOptions);
}

export default function OpAiAssistant() {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [androidMicState, setAndroidMicState] = useState({ isRecording: false, isProcessing: false });
  const [text, setText] = useState("");
  const [processing, setProcessing] = useState(false);
  const [messages, setMessages] = useState<UiMessage[]>([
    { role: "assistant", text: getOnniIntroduction() },
  ]);
  const sessionRef = useRef<{ lastAnswer?: string; lastAnswerFromGemini?: boolean }>({});
  const pendingVoiceRef = useRef("");
  const chromeSpaceHoldRef = useRef(false);

  const {
    voiceListening,
    nativeWakeListening,
    voiceCaptureActive,
    setVoiceListening,
    speakAnswer,
    startVoiceCapture,
    stopVoiceCapture,
    toggleVoiceCapture,
    startNativeWakeListening,
    stopNativeWakeListening,
    usesContinuousMic,
    usesOneShotNativeMic,
    supportsNativeWakeSwitch,
    nativeFollowUpActive,
    canListen,
    canSpeak,
  } = useOnniChatVoice();

  const showAzureMic = isOnniAndroidVoice() && isAzureMicSupported();
  /** Chrome/Edge escritorio: mic Web Speech mantener pulsado + Espacio. */
  const showChromeWebPushToTalk = isDesktopWebBrowser() && canListen;

  const runCommandRef = useRef<(raw: string) => Promise<string | undefined>>(async () => undefined);
  const openRef = useRef(open);
  openRef.current = open;

  const hint = useMemo(() => getOpAssistantHint(location.pathname), [location.pathname]);
  const isHomePortada = location.pathname === "/";
  const showSocialIcons = location.pathname === "/";

  const runCommand = useCallback(
    async (raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed) return;

      setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
      setProcessing(true);

      try {
        const wikiTopic = extractWikipediaTopic(trimmed);
        if (wikiTopic) {
          try {
            const wiki = await fetchWikipediaSummary(wikiTopic);
            const shortAnswer = wiki
              ? `${wiki.title}: ${wiki.shortText}`
              : "No encontré un resultado claro en Wikipedia para eso. Prueba con otro nombre.";
            appendAssistantAnswer(setMessages, sessionRef, shortAnswer, speakAnswer);

            if (wiki && location.pathname.startsWith("/aula-virtual")) {
              publishOnniAulaKnowledge({
                title: wiki.title,
                shortText: wiki.shortText,
                fullText: wiki.fullText,
                sourceUrl: wiki.canonicalUrl,
              });
            }
            return shortAnswer;
          } catch {
            const failAnswer = "Ahora mismo no pude consultar Wikipedia. Inténtalo de nuevo en unos segundos.";
            appendAssistantAnswer(setMessages, sessionRef, failAnswer, speakAnswer);
            return failAnswer;
          }
        }

        const result = resolveOpCommand(trimmed, location.pathname, {
          lastAnswer: sessionRef.current.lastAnswer,
        });

        const resolverHandled = isOnniNavigationResult(result) || !isOnniResolverFallback(result.answer);

        if (resolverHandled) {
          if (result.navigateBack) {
            navigate(-1);
          } else if (result.navigateTo) {
            if (result.navigateTo === "/reproductor-galeria" && invokeOpenGalleryDirect()) {
              // Mantener exactamente la misma experiencia del icono de inicio en Android.
            } else if (result.navigateTo.startsWith("home-social:")) {
              const iconId = result.navigateTo.replace("home-social:", "").trim() as HomeSocialIconId;
              const icons = loadHomeSocialRedesConfig();
              openHomeSocialRedes(getHomeSocialUrl(icons, iconId, "redes"));
            } else {
              const [path, hash] = result.navigateTo.split("#");
              if (hash) {
                navigate(path);
                window.setTimeout(() => {
                  document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
                }, 400);
              } else {
                navigate(result.navigateTo);
              }
            }
          }
          if (result.command) dispatchOpCommand(result.command);
          appendAssistantAnswer(setMessages, sessionRef, result.answer, speakAnswer);
          return result.answer;
        }

        const aiAnswer = await askOnniGemini({
          message: trimmed,
          contextPath: location.pathname,
        });
        const finalAnswer =
          aiAnswer ??
          "No pude conectar con la IA (ChatGPT/Gemini). Revisa internet o las claves del backend.";
        appendAssistantAnswer(setMessages, sessionRef, finalAnswer, speakAnswer, {
          fromGemini: Boolean(aiAnswer),
        });
        return finalAnswer;
      } finally {
        setProcessing(false);
      }
    },
    [location.pathname, navigate, speakAnswer],
  );

  runCommandRef.current = runCommand;

  const azureMicCallbacks = useMemo(
    () => ({
      onCommand: (command: string) => {
        void runCommandRef.current(command);
      },
      onWakeWithoutCommand: () => {
        const prompt = getOnniIntroduction();
        sessionRef.current.lastAnswer = prompt;
        if (openRef.current) {
          setMessages((prev) => [
            ...prev,
            { role: "user", text: "Hola Onni" },
            { role: "assistant", text: prompt },
          ]);
        }
        speakAnswer(prompt);
      },
      onError: (message: string) => {
        if (openRef.current) {
          setMessages((prev) => [...prev, { role: "assistant", text: message }]);
        } else {
          toast.error(message);
        }
      },
    }),
    [speakAnswer],
  );

  // En web dejamos Onni en modo push-to-talk (Espacio), sin wake-word continuo.
  const wakeWordActive = false;

  const captureMicActive = voiceCaptureActive;

  const nativeWakeActive =
    !isOnniAndroidVoice() &&
    !isDesktopWebBrowser() &&
    supportsNativeWakeSwitch &&
    canListen &&
    !processing &&
    !voiceCaptureActive;

  const { isListening: wakeListening, isSpeaking: wakeSpeaking } = useOnniVoice({
    enabled: wakeWordActive,
    speakEnabled: canSpeak,
    onWake: (command) => {
      void runCommandRef.current(command);
    },
    onWakeWithoutCommand: () => {
      const prompt = getOnniIntroduction();
      sessionRef.current.lastAnswer = prompt;
      setMessages((prev) => [
        ...prev,
        { role: "user", text: "Hola Onni" },
        { role: "assistant", text: prompt },
      ]);
      speakAnswer(prompt);
    },
      onError: (message) => {
        if (!shouldShowNativeVoiceError(message)) return;
        if (openRef.current) {
        setMessages((prev) => [...prev, { role: "assistant", text: message }]);
      } else {
        toast.error(message);
      }
    },
  });

  const avatarState =
    wakeSpeaking
      ? "speaking"
      : wakeListening ||
          voiceListening ||
          nativeWakeListening ||
          androidMicState.isRecording ||
          captureMicActive
        ? "listening"
        : "idle";

  const nativeWakeCallbacks = useMemo(
    () => ({
      onWake: (command: string) => {
        void runCommandRef.current(command);
      },
      onWakeWithoutCommand: () => {
        const prompt = getOnniIntroduction();
        sessionRef.current.lastAnswer = prompt;
        if (openRef.current) {
          setMessages((prev) => [
            ...prev,
            { role: "user", text: "Hola Onni" },
            { role: "assistant", text: prompt },
          ]);
        }
        speakAnswer(prompt);
      },
      onError: (message: string) => {
        if (!shouldShowNativeVoiceError(message)) return;
        if (openRef.current) {
          setMessages((prev) => [...prev, { role: "assistant", text: message }]);
        } else {
          toast.error(message);
        }
      },
    }),
    [speakAnswer],
  );
  const nativeWakeCallbacksRef = useRef(nativeWakeCallbacks);
  nativeWakeCallbacksRef.current = nativeWakeCallbacks;

  useEffect(() => {
    if (isOnniAndroidVoice()) return;

    if (!nativeWakeActive) {
      stopNativeWakeListening();
      return;
    }

    let cancelled = false;
    void startNativeWakeListening(nativeWakeCallbacksRef.current).then((started) => {
      if (!cancelled && !started) stopNativeWakeListening();
    });

    return () => {
      cancelled = true;
      stopNativeWakeListening();
    };
  }, [nativeWakeActive, startNativeWakeListening, stopNativeWakeListening]);

  const voiceCallbacks = useMemo(
    () => ({
      onTranscript: (transcript: string) => {
        setText("");
        void runCommand(transcript);
      },
      onError: (errorText: string) => {
        if (!shouldShowNativeVoiceError(errorText)) return;
        if (openRef.current) {
          setMessages((prev) => [...prev, { role: "assistant", text: errorText }]);
        } else {
          toast.error(errorText);
        }
      },
      onFallbackToNative: () => {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: "La voz del navegador no respondió; uso la voz nativa de la app.",
          },
        ]);
      },
    }),
    [runCommand],
  );

  const handleStartVoiceCapture = useCallback(async () => {
    pendingVoiceRef.current = "";
    setText("");
    const permission = await requestOnniMicrophoneAccess();
    if (permission === "denied") {
      voiceCallbacks.onError(onniMicDeniedMessage());
      return;
    }
    if (permission === "unsupported") {
      voiceCallbacks.onError("Micrófono no disponible en este dispositivo.");
      return;
    }
    startVoiceCapture(voiceCallbacks);
  }, [startVoiceCapture, voiceCallbacks]);

  const handleToggleVoiceCapture = useCallback(() => {
    pendingVoiceRef.current = "";
    setText("");
    void toggleVoiceCapture(voiceCallbacks);
  }, [toggleVoiceCapture, voiceCallbacks]);

  const stopVoiceCaptureHandler = useCallback(() => {
    const transcript = stopVoiceCapture();
    setText("");
    if (transcript) void runCommand(transcript);
  }, [runCommand, stopVoiceCapture]);

  useEffect(() => {
    if (!showChromeWebPushToTalk || open || chromeSpaceHoldRef.current) return;
    if (voiceCaptureActive) stopVoiceCapture();
  }, [open, showChromeWebPushToTalk, voiceCaptureActive, stopVoiceCapture]);

  useEffect(() => {
    if (!showChromeWebPushToTalk) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" && event.key !== " ") return;
      if (event.repeat) return;
      if (isEditableKeyboardTarget(event.target)) return;
      if (processing || captureMicActive) return;
      event.preventDefault();
      chromeSpaceHoldRef.current = true;
      handleStartVoiceCapture();
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code !== "Space" && event.key !== " ") return;
      if (!chromeSpaceHoldRef.current) return;
      chromeSpaceHoldRef.current = false;
      event.preventDefault();
      stopVoiceCaptureHandler();
    };

    const onBlur = () => {
      if (!chromeSpaceHoldRef.current) return;
      chromeSpaceHoldRef.current = false;
      stopVoiceCaptureHandler();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [
    showChromeWebPushToTalk,
    processing,
    captureMicActive,
    handleStartVoiceCapture,
    stopVoiceCaptureHandler,
  ]);

  const onSpeakLastAnswer = useCallback(() => {
    const textToSpeak = sessionRef.current.lastAnswer?.trim();
    if (!textToSpeak) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Aún no tengo una respuesta para leer en voz alta." },
      ]);
      return;
    }
    if (!canSpeak) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "La voz no está disponible en este navegador." },
      ]);
      return;
    }
    speakAnswer(textToSpeak, {
      fromGemini: sessionRef.current.lastAnswerFromGemini ?? false,
    });
  }, [canSpeak, speakAnswer]);

  const onSend = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    setText("");
    void runCommand(trimmed);
  };

  const closedAvatarSize = isHomePortada ? "hero" : "lg";
  const closedAvatarClass = isHomePortada ? "max-sm:!h-24 max-sm:!w-24" : undefined;

  return (
    <div
      className={`pointer-events-none fixed z-[80] max-sm:flex max-sm:flex-col max-sm:items-start max-sm:gap-2 sm:block ${
        isHomePortada && !open
          ? "bottom-10 left-1/2 w-auto max-w-none -translate-x-1/2 max-sm:bottom-14 sm:bottom-8"
          : "bottom-10 left-4 w-[min(92vw,380px)] sm:bottom-8 sm:left-10"
      }`}
    >
      {!open ? (
        <button
          type="button"
          className={`pointer-events-auto relative z-[90] order-1 group flex flex-col items-center gap-2 rounded-2xl border-0 bg-transparent p-0 outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70 ${
            isHomePortada
              ? "fixed left-1/2 top-[56%] -translate-x-1/2 -translate-y-1/2 max-sm:top-[58%]"
              : ""
          }`}
          onClick={() => setOpen(true)}
          aria-label={
            captureMicActive
              ? "Suelta Espacio o el micrófono para enviar a Onni"
              : wakeListening || nativeWakeListening
                ? "Onni escuchando. Di Hola Onni y tu pedido"
                : "Abrir Onni"
          }
        >
          <OnniAvatarDots size={closedAvatarSize} state={avatarState} className={closedAvatarClass} />
        </button>
      ) : (
        <div className="pointer-events-auto rounded-2xl border border-cyan-300/35 bg-card/90 backdrop-blur-xl shadow-[0_0_45px_-16px_rgba(34,211,238,0.8)]">
          <div className="flex items-start gap-3 border-b border-white/10 px-3 py-3">
            <OnniAvatarDots size="md" state={avatarState} className="mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-cyan-100">Onni</p>
            </div>
            <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Cerrar
            </Button>
          </div>
          <div className="h-52 space-y-2 overflow-y-auto px-3 py-2">
            {messages.map((m, idx) => (
              <div key={idx} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[86%] whitespace-pre-wrap rounded-xl px-2.5 py-1.5 text-xs ${
                    m.role === "user" ? "bg-cyan-500/25 text-cyan-50" : "bg-white/10 text-foreground"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            <p className="text-[11px] text-muted-foreground">{hint}</p>
            {usesOneShotNativeMic && captureMicActive && (
              <p className="text-[10px] font-medium text-emerald-300/90">
                Escuchando… di tu pedido completo.
              </p>
            )}
            {usesContinuousMic && captureMicActive && (
              <p className="text-[10px] font-medium text-emerald-300/90">
                Micrófono activo — habla cuando quieras. Pulsa el micrófono otra vez para apagar.
              </p>
            )}
            {showAzureMic && androidMicState.isRecording && (
              <p className="text-[10px] font-medium text-emerald-300/90">
                Grabando… di «Hola Onni, llévame a…» y pulsa el mic otra vez.
              </p>
            )}
            {showAzureMic && androidMicState.isProcessing && (
              <p className="text-[10px] font-medium text-emerald-300/90">Transcribiendo con Azure…</p>
            )}
            {showChromeWebPushToTalk && captureMicActive && (
              <p className="text-[10px] font-medium text-emerald-300/90">
                Grabando… mantén pulsado el micrófono o Espacio y di tu pedido.
              </p>
            )}
            {wakeWordActive && wakeListening && !captureMicActive && (
              <p className="text-[10px] font-medium text-emerald-300/90">
                Onni te escucha — di «Hola Onni» o «Onni…» + tu pedido.
              </p>
            )}
            {supportsNativeWakeSwitch &&
              nativeWakeListening &&
              !captureMicActive &&
              !isOnniAndroidVoice() &&
              !isDesktopWebBrowser() && (
              <p className="text-[10px] font-medium text-emerald-300/90">
                {nativeFollowUpActive
                  ? "Te escucho — di tu pedido (sin repetir «Hola Onni»)."
                  : "Di «Hola Onni, llévame a…» en una frase, o solo «Hola Onni» y luego tu pedido."}
              </p>
            )}
          </div>
          <form onSubmit={onSend} className="flex items-center gap-2 border-t border-white/10 p-3">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="pregunta a Onni o pide ayuda"
            />
            {(canSpeak || canListen || showAzureMic) && (
              <>
                {canSpeak && (
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={onSpeakLastAnswer}
                    aria-label="Escuchar la última respuesta de Onni"
                  >
                    <Volume2 className="h-4 w-4" />
                  </Button>
                )}
                {showAzureMic && (
                  <OpAiAndroidAzureMic
                    callbacks={azureMicCallbacks}
                    processing={processing}
                    panelOpen={open}
                    onStateChange={setAndroidMicState}
                  />
                )}
                {canListen && (
                  <Button
                    type="button"
                    size="icon"
                    variant={captureMicActive ? "secondary" : "outline"}
                    onClick={
                      usesOneShotNativeMic
                        ? () => void handleToggleVoiceCapture()
                        : usesContinuousMic
                          ? () => void handleToggleVoiceCapture()
                          : undefined
                    }
                    onPointerDown={
                      usesOneShotNativeMic || usesContinuousMic
                        ? undefined
                        : (event) => {
                            event.preventDefault();
                            handleStartVoiceCapture();
                          }
                    }
                    onPointerUp={
                      usesOneShotNativeMic || usesContinuousMic
                        ? undefined
                        : (event) => {
                            event.preventDefault();
                            stopVoiceCaptureHandler();
                          }
                    }
                    onPointerCancel={
                      usesOneShotNativeMic || usesContinuousMic
                        ? undefined
                        : (event) => {
                            event.preventDefault();
                            stopVoiceCaptureHandler();
                          }
                    }
                    onPointerLeave={
                      usesOneShotNativeMic || usesContinuousMic
                        ? undefined
                        : (event) => {
                            if (!captureMicActive) return;
                            event.preventDefault();
                            stopVoiceCaptureHandler();
                          }
                    }
                    onContextMenu={(event) => event.preventDefault()}
                    aria-label={
                      captureMicActive
                        ? usesOneShotNativeMic
                          ? "Detener micrófono de Onni"
                          : usesContinuousMic
                            ? "Detener micrófono de Onni"
                            : "Soltar micrófono de Onni"
                        : usesOneShotNativeMic
                          ? "Pulsa y di tu pedido a Onni"
                          : usesContinuousMic
                            ? "Activar micrófono de Onni (escucha continua)"
                            : "Mantener pulsado para hablar con Onni"
                    }
                  >
                    {captureMicActive ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </Button>
                )}
              </>
            )}
            <Button type="submit" size="icon" variant="hero" aria-label="Enviar" disabled={processing}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}
      {showSocialIcons && <HomeSocialRedesRow />}
    </div>
  );
}
