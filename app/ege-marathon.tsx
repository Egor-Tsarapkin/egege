"use client";

import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Code2,
  Heart,
  House,
  Minus,
  Moon,
  Plus,
  Settings,
  Star,
  Sun,
  Timer,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { QUESTIONS, type MarathonQuestion } from "./ege-marathon-data";

type MarathonTheme = "dark" | "light";
type MarathonAccent =
  | "lime"
  | "blue"
  | "red"
  | "pink"
  | "beige"
  | "orange"
  | "purple"
  | "cyan"
  | "yellow"
  | "mint";
type MarathonScreen = "home" | "quiz" | "themes" | "favorites" | "errors" | "settings";
type AnswerState = "correct" | "wrong";

type LocalState = {
  answered: Record<string, AnswerState>;
  favorites: string[];
  marathonOrder: string[];
  autoAdvance: boolean;
  successEffect: boolean;
};

const STORAGE_KEY = "egege-marathon-mvp-v1";
const DEFAULT_LOCAL_STATE: LocalState = {
  answered: {},
  favorites: [],
  marathonOrder: [],
  autoAdvance: true,
  successEffect: true,
};

function shuffle<T>(items: T[]) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
  }
  return result;
}

function createMarathonOrder() {
  const buckets = new Map<string, string[]>();
  for (const question of QUESTIONS) {
    const bucket = buckets.get(question.topic) ?? [];
    bucket.push(question.id);
    buckets.set(question.topic, bucket);
  }
  for (const [topic, ids] of buckets) buckets.set(topic, shuffle(ids));

  const order: string[] = [];
  let previousTopic = "";
  while (order.length < QUESTIONS.length) {
    const availableTopics = [...buckets.entries()]
      .filter(([topic, ids]) => ids.length > 0 && topic !== previousTopic)
      .map(([topic, ids]) => ({ topic, ids, random: Math.random() }))
      .sort((left, right) => right.ids.length - left.ids.length || left.random - right.random);
    const next = availableTopics[0] ?? [...buckets.entries()]
      .filter(([, ids]) => ids.length > 0)
      .map(([topic, ids]) => ({ topic, ids }))[0];
    if (!next) break;
    const id = next.ids.pop();
    if (!id) break;
    order.push(id);
    previousTopic = next.topic;
  }
  return order;
}

const PYTHON_KEYWORDS = new Set([
  "and", "as", "assert", "async", "await", "break", "class", "continue", "def", "del",
  "elif", "else", "except", "False", "finally", "for", "from", "global", "if", "import",
  "in", "is", "lambda", "None", "nonlocal", "not", "or", "pass", "raise", "return", "True",
  "try", "while", "with", "yield",
]);

function PythonCode({ code, scale, onScale }: { code: string; scale: number; onScale: (value: number) => void }) {
  const tokens = code.split(/(#[^\n]*|"[^"\n]*"|'[^'\n]*'|\b\d+(?:\.\d+)?\b|\b[A-Za-z_]\w*\b)/g);

  return (
    <section className="marathon-code">
      <div className="marathon-code-bar">
        <span><i /><i /><i /> Python</span>
        <div>
          <button onClick={() => onScale(Math.max(0.78, scale - 0.1))} aria-label="Уменьшить код"><Minus /></button>
          <span>{Math.round(scale * 100)}%</span>
          <button onClick={() => onScale(Math.min(1.42, scale + 0.1))} aria-label="Увеличить код"><Plus /></button>
        </div>
      </div>
      <pre style={{ fontSize: `${scale}rem` }}><code>{tokens.map((token, index) => {
        let className = "";
        if (/^#/.test(token)) className = "tok-comment";
        else if (/^["']/.test(token)) className = "tok-string";
        else if (/^\d/.test(token)) className = "tok-number";
        else if (PYTHON_KEYWORDS.has(token)) className = "tok-keyword";
        else if (["print", "int", "float", "str", "bool", "range", "len"].includes(token)) className = "tok-built-in";
        return <span className={className} key={`${index}-${token}`}>{token}</span>;
      })}</code></pre>
    </section>
  );
}

function Toggle({ active, label, note, onClick }: { active: boolean; label: string; note: string; onClick: () => void }) {
  return (
    <button className="marathon-setting-row" onClick={onClick} role="switch" aria-checked={active}>
      <span><strong>{label}</strong><small>{note}</small></span>
      <i className={active ? "is-active" : ""}><b /></i>
    </button>
  );
}

export default function EgeMarathon({
  theme,
  accent,
  onThemeChange,
}: {
  theme: MarathonTheme;
  accent: MarathonAccent;
  onThemeChange: (theme: MarathonTheme) => void;
}) {
  const [screen, setScreen] = useState<MarathonScreen>("home");
  const [local, setLocal] = useState<LocalState>(DEFAULT_LOCAL_STATE);
  const [ready, setReady] = useState(false);
  const [queue, setQueue] = useState<string[]>(QUESTIONS.map((question) => question.id));
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [graded, setGraded] = useState(false);
  const [flash, setFlash] = useState(0);
  const [codeScale, setCodeScale] = useState(0.9);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [swipeSettling, setSwipeSettling] = useState(false);
  const [pendingQuestionIndex, setPendingQuestionIndex] = useState<number | null>(null);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [visibleQuestionRadius, setVisibleQuestionRadius] = useState(2);
  const questionStage = useRef<HTMLDivElement | null>(null);
  const swipeGesture = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    lastX: number;
    lastTime: number;
    velocity: number;
    axis: "x" | "y" | null;
  } | null>(null);
  const suppressAnswerUntil = useRef(0);
  const autoTimer = useRef<number | null>(null);
  const navigationTimer = useRef<number | null>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}") as Partial<LocalState>;
      setLocal({
        answered: saved.answered ?? {},
        favorites: Array.isArray(saved.favorites) ? saved.favorites : [],
        marathonOrder: Array.isArray(saved.marathonOrder) ? saved.marathonOrder : [],
        autoAdvance: saved.autoAdvance ?? true,
        successEffect: saved.successEffect ?? true,
      });
    } catch {
      setLocal(DEFAULT_LOCAL_STATE);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(local));
    } catch {
      // The marathon remains usable when browser storage is unavailable.
    }
  }, [local, ready]);

  useEffect(() => {
    const syncVisibleQuestions = () => {
      if (window.matchMedia("(max-width: 700px)").matches) {
        setVisibleQuestionRadius(2);
        return;
      }
      const availableWidth = Math.min(window.innerWidth - 40, 850);
      const radius = Math.floor(((availableWidth / 48) - 1) / 2);
      setVisibleQuestionRadius(Math.max(2, Math.min(7, radius)));
    };
    syncVisibleQuestions();
    window.addEventListener("resize", syncVisibleQuestions);
    return () => window.removeEventListener("resize", syncVisibleQuestions);
  }, []);

  useEffect(() => () => {
    if (autoTimer.current) window.clearTimeout(autoTimer.current);
    if (navigationTimer.current) window.clearTimeout(navigationTimer.current);
  }, []);

  const byId = useMemo(() => new Map(QUESTIONS.map((question) => [question.id, question])), []);
  const activeQuestion = byId.get(queue[questionIndex]) ?? QUESTIONS[0];
  const favorites = useMemo(() => new Set(local.favorites), [local.favorites]);
  const allQuestionIds = QUESTIONS.map((question) => question.id);
  const answeredCount = allQuestionIds.filter((id) => local.answered[id]).length;
  const correctCount = allQuestionIds.filter((id) => local.answered[id] === "correct").length;
  const queueCorrectCount = queue.filter((id) => local.answered[id] === "correct").length;
  const errorIds = allQuestionIds.filter((id) => local.answered[id] === "wrong");
  const isWarmAccent = ["red", "pink", "orange"].includes(accent);
  const savedMarathonOrder = local.marathonOrder.length === QUESTIONS.length
    && new Set(local.marathonOrder).size === QUESTIONS.length
    && local.marathonOrder.every((id) => byId.has(id))
    ? local.marathonOrder
    : allQuestionIds;
  const firstUnansweredIndex = savedMarathonOrder.findIndex((id) => !local.answered[id]);
  const resumeIndex = firstUnansweredIndex < 0 ? 0 : firstUnansweredIndex;

  const resetAnswer = () => {
    setSelected(null);
    setGraded(false);
    setCodeScale(0.9);
    setSwipeOffset(0);
    setSwipeSettling(false);
    setPendingQuestionIndex(null);
  };

  const completeNavigation = (index: number) => {
    if (navigationTimer.current) window.clearTimeout(navigationTimer.current);
    navigationTimer.current = null;
    setQuestionIndex(index);
    resetAnswer();
  };

  const goTo = (index: number) => {
    const targetIndex = Math.max(0, Math.min(queue.length - 1, index));
    if (targetIndex === questionIndex || swipeSettling) return;
    if (autoTimer.current) window.clearTimeout(autoTimer.current);
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    const width = questionStage.current?.clientWidth ?? window.innerWidth;
    setPendingQuestionIndex(targetIndex);
    setSwipeSettling(true);
    setSwipeOffset((targetIndex > questionIndex ? -1 : 1) * (width + 16));
    navigationTimer.current = window.setTimeout(() => completeNavigation(targetIndex), 380);
  };

  const next = () => {
    if (questionIndex < queue.length - 1) {
      goTo(questionIndex + 1);
    } else {
      setScreen("home");
      setQuestionIndex(0);
      resetAnswer();
    }
  };

  const previous = () => {
    if (questionIndex > 0) goTo(questionIndex - 1);
  };

  const start = (ids: string[], index = 0) => {
    if (!ids.length) return;
    setQueue(ids);
    setQuestionIndex(index);
    setSelected(null);
    setGraded(false);
    setScreen("quiz");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const startNewMarathon = () => {
    const order = createMarathonOrder();
    setLocal((current) => ({ ...current, answered: {}, marathonOrder: order }));
    setShowResumePrompt(false);
    start(order);
  };

  const answer = (optionIndex: number) => {
    if (graded || performance.now() < suppressAnswerUntil.current) return;
    const isCorrect = optionIndex === activeQuestion.correct;
    setSelected(optionIndex);
    setGraded(true);
    setLocal((current) => ({
      ...current,
      answered: { ...current.answered, [activeQuestion.id]: isCorrect ? "correct" : "wrong" },
    }));

    if (isCorrect && local.successEffect) setFlash((value) => value + 1);
    if (isCorrect && local.autoAdvance) {
      autoTimer.current = window.setTimeout(next, 680);
    }
  };

  const toggleFavorite = (id: string) => {
    setLocal((current) => ({
      ...current,
      favorites: current.favorites.includes(id)
        ? current.favorites.filter((item) => item !== id)
        : [...current.favorites, id],
    }));
  };

  const onSwipeStart = (event: React.PointerEvent<HTMLElement>) => {
    if (swipeSettling) return;
    swipeGesture.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastTime: performance.now(),
      velocity: 0,
      axis: null,
    };
  };

  const onSwipeMove = (event: React.PointerEvent<HTMLElement>) => {
    const gesture = swipeGesture.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - gesture.startX;
    const deltaY = event.clientY - gesture.startY;
    if (!gesture.axis && Math.max(Math.abs(deltaX), Math.abs(deltaY)) > 9) {
      gesture.axis = Math.abs(deltaX) > Math.abs(deltaY) * 1.15 ? "x" : "y";
      if (gesture.axis === "x") event.currentTarget.setPointerCapture(event.pointerId);
    }
    if (gesture.axis !== "x") return;

    event.preventDefault();
    const now = performance.now();
    const elapsed = Math.max(1, now - gesture.lastTime);
    gesture.velocity = (event.clientX - gesture.lastX) / elapsed;
    gesture.lastX = event.clientX;
    gesture.lastTime = now;
    const atStart = questionIndex === 0 && deltaX > 0;
    const atEnd = questionIndex === queue.length - 1 && deltaX < 0;
    setSwipeOffset(atStart || atEnd ? deltaX * 0.24 : deltaX);
  };

  const finishSwipe = (event: React.PointerEvent<HTMLElement>) => {
    const gesture = swipeGesture.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    swipeGesture.current = null;
    if (gesture.axis !== "x") return;

    suppressAnswerUntil.current = performance.now() + 320;
    const projected = swipeOffset + gesture.velocity * 150;
    const wantsNext = projected < -58 && questionIndex < queue.length - 1;
    const wantsPrevious = projected > 58 && questionIndex > 0;
    setSwipeSettling(true);

    if (wantsNext || wantsPrevious) {
      const width = questionStage.current?.clientWidth ?? window.innerWidth;
      setSwipeOffset((wantsNext ? -1 : 1) * (width + 16));
      const targetIndex = questionIndex + (wantsNext ? 1 : -1);
      setPendingQuestionIndex(targetIndex);
      navigationTimer.current = window.setTimeout(() => completeNavigation(targetIndex), 380);
      return;
    }

    setSwipeOffset(0);
    window.setTimeout(() => setSwipeSettling(false), 260);
  };

  const topics = useMemo(() => [...new Set(QUESTIONS.map((question) => question.topic))], []);

  if (screen === "quiz") {
    const questionSlots = Array.from(
      { length: visibleQuestionRadius * 2 + 1 },
      (_, slot) => questionIndex + slot - visibleQuestionRadius,
    );
    const previousPreviewIndex = pendingQuestionIndex !== null && pendingQuestionIndex < questionIndex
      ? pendingQuestionIndex
      : questionIndex - 1;
    const nextPreviewIndex = pendingQuestionIndex !== null && pendingQuestionIndex > questionIndex
      ? pendingQuestionIndex
      : questionIndex + 1;
    const previousQuestion = byId.get(queue[previousPreviewIndex]);
    const nextQuestion = byId.get(queue[nextPreviewIndex]);
    const renderQuestionPreview = (question: MarathonQuestion | undefined, fallback: string) => {
      if (!question) {
        return <aside className="marathon-question-preview" aria-hidden="true"><strong>{fallback}</strong></aside>;
      }

      return (
        <article className="marathon-question-card marathon-question-preview is-full" aria-hidden="true" key={question.id}>
          <div className="marathon-question-meta"><span>{question.topic}</span></div>
          <h2>{question.prompt}</h2>
          {question.code && <PythonCode code={question.code} scale={0.9} onScale={() => undefined} />}
          <div className="marathon-options">
            {question.options.map((option, index) => (
              <button tabIndex={-1} key={`${question.id}-${option}`}><span>{index + 1}</span><code>{option}</code></button>
            ))}
          </div>
        </article>
      );
    };

    return (
      <section
        className={`ege-marathon is-quiz ${isWarmAccent ? "has-warm-accent" : ""}`}
        onPointerDown={onSwipeStart}
        onPointerMove={onSwipeMove}
        onPointerUp={finishSwipe}
        onPointerCancel={finishSwipe}
      >
        {flash > 0 && <span className="marathon-success-flash" key={flash} />}
        <header className="marathon-quiz-header">
          <button className="marathon-home-button" onClick={() => setScreen("home")} aria-label="На главную"><House /><span>Главная</span></button>
          <div
            className="marathon-quiz-progress"
            aria-label={`Вопрос ${questionIndex + 1} из ${queue.length}, правильных ответов ${queueCorrectCount}`}
          >
            <i>
              <b className="is-position" style={{ width: `${((questionIndex + 1) / queue.length) * 100}%` }} />
              <b className="is-correct" style={{ width: `${(queueCorrectCount / queue.length) * 100}%` }} />
            </i>
          </div>
          <button className={favorites.has(activeQuestion.id) ? "is-favorite" : ""} onClick={() => toggleFavorite(activeQuestion.id)} aria-label="Добавить в избранное"><Star /></button>
        </header>

        <nav
          className="marathon-question-strip"
          aria-label="Вопросы марафона"
          style={{ "--question-count": questionSlots.length } as React.CSSProperties}
        >
          {questionSlots.map((index, slot) => {
            const id = queue[index];
            if (!id) return <span className="is-empty-slot" aria-hidden="true" key={`empty-${slot}`} />;
            return (
              <button
                className={`${index === questionIndex ? "is-current" : ""} ${local.answered[id] ? `is-${local.answered[id]}` : ""}`}
                onClick={() => goTo(index)}
                key={id}
              >{index + 1}</button>
            );
          })}
        </nav>

        <div
          className="marathon-question-stage"
          ref={questionStage}
        >
          <div
            className={`marathon-question-track ${swipeSettling ? "is-settling" : ""}`}
            style={{ "--swipe-x": `${swipeOffset}px` } as React.CSSProperties}
            onTransitionEnd={(event) => {
              if (event.target === event.currentTarget && event.propertyName === "transform" && pendingQuestionIndex !== null) {
                completeNavigation(pendingQuestionIndex);
              }
            }}
          >
            {renderQuestionPreview(previousQuestion, "Начало марафона")}

            <article className="marathon-question-card" key={activeQuestion.id}>
          <div className="marathon-question-meta"><span>{activeQuestion.topic}</span></div>
          <h2>{activeQuestion.prompt}</h2>
          {activeQuestion.code && <PythonCode code={activeQuestion.code} scale={codeScale} onScale={setCodeScale} />}
          <div className="marathon-options">
            {activeQuestion.options.map((option, index) => {
              const isCorrect = index === activeQuestion.correct;
              let state = "";
              if (graded && isCorrect) state = "is-correct";
              else if (graded && !isCorrect && selected !== activeQuestion.correct) state = "is-wrong";
              else if (selected === index) state = "is-selected";
              return (
                <button className={state} onClick={() => answer(index)} onPointerUp={(event) => event.currentTarget.blur()} disabled={graded} key={`${activeQuestion.id}-${option}`}>
                  <span>{index + 1}</span><code>{option}</code>
                  {graded && isCorrect && <Check />}
                  {graded && !isCorrect && selected !== activeQuestion.correct && <X />}
                </button>
              );
            })}
          </div>

          {graded && selected !== activeQuestion.correct && (
            <aside className="marathon-explanation">
              <span><BookOpen /></span>
              <div><strong>Комментарий</strong><p>{activeQuestion.explanation}</p></div>
            </aside>
          )}

          {graded && (!local.autoAdvance || selected !== activeQuestion.correct) && (
            <button className="marathon-next-button" onClick={next}>
              {questionIndex === queue.length - 1 ? "Завершить" : "Следующий вопрос"}<ChevronRight />
            </button>
          )}
            </article>

            {renderQuestionPreview(nextQuestion, "Марафон завершён")}
          </div>
        </div>

        <div className="marathon-quiz-nav">
          <button onClick={previous} disabled={questionIndex === 0}><ChevronLeft /> Назад</button>
          <span>{questionIndex + 1} / {queue.length}</span>
          <button onClick={next}>{questionIndex === queue.length - 1 ? "Готово" : "Дальше"} <ChevronRight /></button>
        </div>
      </section>
    );
  }

  if (screen === "settings") {
    return (
      <section className="ege-marathon marathon-subpage">
        <header><button onClick={() => setScreen("home")}><ArrowLeft /></button><div><strong>Настройки</strong><span>EGE-марафон</span></div></header>
        <div className="marathon-settings-card">
          <h2>Как проходить марафон</h2>
          <Toggle
            active={local.autoAdvance}
            label="Сразу переходить дальше"
            note="После верного ответа откроется следующий вопрос"
            onClick={() => setLocal((current) => ({ ...current, autoAdvance: !current.autoAdvance }))}
          />
          <Toggle
            active={local.successEffect}
            label="Мягкая вспышка"
            note="Акцентная волна по краям при верном ответе"
            onClick={() => setLocal((current) => ({ ...current, successEffect: !current.successEffect }))}
          />
          <div className="marathon-theme-setting">
            <div><strong>Оформление</strong><small>Тема применяется ко всему сайту</small></div>
            <div>
              <button className={theme === "light" ? "is-active" : ""} onClick={() => onThemeChange("light")}><Sun /> Светлая</button>
              <button className={theme === "dark" ? "is-active" : ""} onClick={() => onThemeChange("dark")}><Moon /> Тёмная</button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (screen === "themes") {
    return (
      <section className="ege-marathon marathon-subpage">
        <header><button onClick={() => setScreen("home")}><ArrowLeft /></button><div><strong>Темы</strong><span>{QUESTIONS.length} вопросов</span></div></header>
        <div className="marathon-topic-list">
          {topics.map((topic) => {
            const ids = QUESTIONS.filter((question) => question.topic === topic).map((question) => question.id);
            const done = ids.filter((id) => local.answered[id]).length;
            return (
              <button onClick={() => start(ids)} key={topic}>
                <span className="marathon-topic-icon">{topic.startsWith("Python") ? <Code2 /> : <BookOpen />}</span>
                <span><strong>{topic}</strong><small>{done} из {ids.length} пройдено</small><i><b style={{ width: `${(done / ids.length) * 100}%` }} /></i></span>
                <ChevronRight />
              </button>
            );
          })}
        </div>
      </section>
    );
  }

  if (screen === "favorites" || screen === "errors") {
    const ids = screen === "favorites" ? local.favorites : errorIds;
    const title = screen === "favorites" ? "Избранное" : "Ошибки";
    return (
      <section className="ege-marathon marathon-subpage">
        <header><button onClick={() => setScreen("home")}><ArrowLeft /></button><div><strong>{title}</strong><span>{ids.length} вопросов</span></div></header>
        {ids.length ? (
          <div className="marathon-saved-list">
            {ids.map((id, index) => {
              const question = byId.get(id);
              if (!question) return null;
              return <button onClick={() => start(ids, index)} key={id}><span>{index + 1}</span><div><strong>{question.prompt}</strong><small>{question.topic}</small></div><ChevronRight /></button>;
            })}
            <button className="marathon-start-saved" onClick={() => start(ids)}>Начать подборку</button>
          </div>
        ) : (
          <div className="marathon-empty"><span>{screen === "favorites" ? <Star /> : <Heart />}</span><h2>{screen === "favorites" ? "Пока ничего не сохранено" : "Ошибок пока нет"}</h2><p>{screen === "favorites" ? "Нажмите звёздочку на экране вопроса." : "Неправильные ответы появятся здесь для повторения."}</p></div>
        )}
      </section>
    );
  }

  return (
    <section className="ege-marathon">
      {showResumePrompt && (
        <div className="marathon-resume-scrim" role="presentation">
          <section className="marathon-resume-dialog" role="dialog" aria-modal="true" aria-labelledby="resume-marathon-title">
            <span>Сохранённый прогресс</span>
            <h2 id="resume-marathon-title">Как начать марафон?</h2>
            <p>Вы остановились на вопросе {resumeIndex + 1} из {QUESTIONS.length}.</p>
            <button
              className="is-primary"
              onClick={() => {
                setShowResumePrompt(false);
                start(savedMarathonOrder, resumeIndex);
              }}
            >
              Продолжить с вопроса {resumeIndex + 1}
            </button>
            <button
              onClick={() => {
                startNewMarathon();
              }}
            >
              Начать заново
            </button>
          </section>
        </div>
      )}
      <header className="marathon-home-header">
        <div><span className="marathon-mark">Е</span><div><strong>EGE-марафон</strong><small>{QUESTIONS.length} вопросов</small></div></div>
        <button onClick={() => setScreen("settings")} aria-label="Настройки марафона"><Settings /></button>
      </header>

      <section className="marathon-hero">
        <div className="marathon-title-block">
          <span>Тренировка</span>
          <h1>ЕГЭ-марафон</h1>
          <p>Вопросы ЕГЭ и Python в одном спокойном режиме.</p>
        </div>
        <div className="marathon-progress-grid">
          <button onClick={() => answeredCount ? start(savedMarathonOrder, resumeIndex) : startNewMarathon()}>
            <strong>{correctCount}<small> / {QUESTIONS.length}</small></strong><i><b style={{ width: `${(correctCount / QUESTIONS.length) * 100}%` }} /></i><span>Вопросы</span>
          </button>
          <button onClick={() => setScreen("themes")}>
            <strong>{topics.filter((topic) => QUESTIONS.filter((question) => question.topic === topic).every((question) => local.answered[question.id] === "correct")).length}<small> / {topics.length}</small></strong><i><b style={{ width: `${(topics.filter((topic) => QUESTIONS.filter((question) => question.topic === topic).every((question) => local.answered[question.id] === "correct")).length / topics.length) * 100}%` }} /></i><span>Темы</span>
          </button>
        </div>
      </section>

      <div className="marathon-menu-grid">
        <button className="is-marathon" onClick={() => answeredCount ? setShowResumePrompt(true) : startNewMarathon()}><span><Timer /></span><div><strong>Марафон</strong><small>{correctCount} правильных ответов</small></div><ChevronRight /></button>
        <button onClick={() => setScreen("themes")}><span><BookOpen /></span><div><strong>Темы</strong><small>{topics.length} подборки</small></div><ChevronRight /></button>
        <button onClick={() => setScreen("errors")}><span><AlertTriangle /></span><div><strong>Ошибки</strong><small>{errorIds.length} для повтора</small></div><ChevronRight /></button>
        <button onClick={() => setScreen("favorites")}><span><Star /></span><div><strong>Избранное</strong><small>{favorites.size} сохранено</small></div><ChevronRight /></button>
      </div>

      <p className="marathon-local-note">Прогресс сохраняется на устройстве</p>
    </section>
  );
}
