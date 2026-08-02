"use client";

import { useEffect, useMemo, useState } from "react";

type TourSection = "home" | "tasks" | "variants";

type TourStep = {
  id: string;
  section: TourSection;
  target?: string;
  eyebrow: string;
  title: string;
  text: string;
  preview?: "result" | "friends";
};

const STEPS: TourStep[] = [
  {
    id: "welcome",
    section: "home",
    eyebrow: "Привет! Я Бит",
    title: "Покажу EGEGE за пару минут",
    text: "Мы заглянем в базу, откроем вариант и разберёмся, где сохраняется прогресс. Никаких длинных анкет — только полезное.",
  },
  {
    id: "filters",
    section: "tasks",
    target: "[data-tour='task-filters']",
    eyebrow: "База заданий",
    title: "Загружай только нужный номер",
    text: "Выбери номер ЕГЭ, сложность или источник. Можно вставить ID задачи — нужный раздел откроется автоматически.",
  },
  {
    id: "task",
    section: "tasks",
    target: "[data-tour='task']",
    eyebrow: "Одно задание — один шанс на XP",
    title: "Сверь ответ честно",
    text: "Открой ответ и отметь совпадение. За каждую задачу опыт начисляется только один раз, а прогресс появится в дашборде.",
  },
  {
    id: "variants",
    section: "variants",
    target: "[data-tour='variant-catalog']",
    eyebrow: "Официальные варианты",
    title: "Здесь собраны реальные источники",
    text: "Демоверсии, основные и резервные волны открываются в режиме, похожем на экзаменационную станцию.",
  },
  {
    id: "exam",
    section: "variants",
    target: ".exam-station",
    eyebrow: "Экзаменационный режим",
    title: "Переключай задания и сохраняй ответы",
    text: "Слева — номера, в центре — условие, снизу или справа — поле ответа. Таймер и прикреплённые файлы всегда под рукой.",
  },
  {
    id: "result",
    section: "variants",
    target: ".exam-station",
    eyebrow: "После финиша",
    title: "Результат собирается автоматически",
    text: "Ты увидишь тестовый балл, время и разбор всех ответов. Завершённые попытки сохраняются в личном кабинете.",
    preview: "result",
  },
  {
    id: "signup",
    section: "home",
    target: "[data-tour='profile']",
    eyebrow: "Остался один шаг",
    title: "Войди через Google",
    text: "Регистрация открывает тренажёр, XP, дашборд и синхронизацию прогресса. Пароль придумывать не нужно.",
  },
  {
    id: "friends",
    section: "home",
    eyebrow: "Дашборд и друзья",
    title: "Соревнуйся только с теми, кого знаешь",
    text: "Добавление не происходит автоматически: другу придёт заявка, и только после подтверждения вы появитесь в рейтинге друг друга.",
    preview: "friends",
  },
];

type Rect = { top: number; left: number; width: number; height: number };

export default function OnboardingTour({
  open,
  onNavigate,
  onPrepareTask,
  onCloseExam,
  onFinish,
}: {
  open: boolean;
  onNavigate: (section: TourSection) => void;
  onPrepareTask: () => void;
  onCloseExam: () => void;
  onFinish: () => void;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const step = STEPS[stepIndex];

  useEffect(() => {
    if (!open) return;
    onNavigate(step.section);
    if (step.id === "task") onPrepareTask();
    if (["welcome", "filters", "task", "variants", "signup", "friends"].includes(step.id)) {
      onCloseExam();
    }
    if (step.id === "exam" || step.id === "result") {
      let attempts = 0;
      let timer = 0;
      const openStation = () => {
        if (document.querySelector(".exam-station")) return;
        const variant = document.querySelector<HTMLButtonElement>("[data-tour='variant']");
        if (variant) variant.click();
        else if (attempts++ < 30) timer = window.setTimeout(openStation, 180);
      };
      timer = window.setTimeout(openStation, 360);
      return () => window.clearTimeout(timer);
    }
  }, [open, step.id, step.section]);

  useEffect(() => {
    if (!open || !step.target) {
      setTargetRect(null);
      return;
    }

    let attempts = 0;
    const update = () => {
      const target = document.querySelector<HTMLElement>(step.target as string);
      if (!target) {
        attempts += 1;
        if (attempts < 60) timer = window.setTimeout(update, 140);
        return;
      }
      target.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
      const frame = window.setTimeout(() => {
        const rect = target.getBoundingClientRect();
        setTargetRect({
          top: Math.max(10, rect.top - 10),
          left: Math.max(10, rect.left - 10),
          width: Math.min(window.innerWidth - 20, rect.width + 20),
          height: Math.min(window.innerHeight - 20, rect.height + 20),
        });
      }, 260);
      timer = frame;
    };
    let timer = window.setTimeout(update, 80);
    const onResize = () => update();
    window.addEventListener("resize", onResize);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", onResize);
    };
  }, [open, step.id, step.target]);

  const calloutStyle = useMemo(() => {
    if (!targetRect) return undefined;
    const roomBelow = window.innerHeight - (targetRect.top + targetRect.height);
    const left = Math.min(
      Math.max(16, targetRect.left + targetRect.width / 2 - 210),
      Math.max(16, window.innerWidth - 436),
    );
    if (roomBelow > 310) {
      return { left, top: targetRect.top + targetRect.height + 18 };
    }
    return { left, bottom: window.innerHeight - targetRect.top + 18 };
  }, [targetRect]);

  if (!open) return null;

  const finish = () => {
    onCloseExam();
    onFinish();
  };

  return (
    <div className="onboarding-tour" role="dialog" aria-modal="true" aria-label="Знакомство с EGEGE">
      {targetRect ? (
        <div className="tour-spotlight" style={targetRect} />
      ) : (
        <div className="tour-backdrop" />
      )}

      <section className={`tour-callout ${targetRect ? "is-anchored" : "is-centered"}`} style={calloutStyle}>
        <div className="tour-mascot" aria-hidden="true">
          <div className="tour-mascot-arm is-left" />
          <div className="tour-mascot-arm is-right" />
          <div className="tour-mascot-body">
            <div className="tour-mascot-screen">
              <i /><i /><b />
            </div>
            <span />
          </div>
          <div className="tour-mascot-foot is-left" />
          <div className="tour-mascot-foot is-right" />
        </div>

        <div className="tour-copy">
          <div className="tour-progress" aria-label={`Шаг ${stepIndex + 1} из ${STEPS.length}`}>
            {STEPS.map((item, index) => <i className={index <= stepIndex ? "is-filled" : ""} key={item.id} />)}
          </div>
          <p>{step.eyebrow}</p>
          <h2>{step.title}</h2>
          <span>{step.text}</span>

          {step.preview === "result" && (
            <div className="tour-result-preview" aria-hidden="true">
              <div><small>Тестовый балл</small><strong>82<em>/100</em></strong></div>
              <div><small>Время</small><b>01:34:12</b></div>
              <div><small>Ответов</small><b>24 / 27</b></div>
            </div>
          )}
          {step.preview === "friends" && (
            <div className="tour-friend-preview" aria-hidden="true">
              <span>🤖</span>
              <div><strong>@bit_student</strong><small>хочет добавить вас в друзья</small></div>
              <b>Принять</b>
            </div>
          )}

          <div className="tour-actions">
            <button className="tour-skip" onClick={finish}>Пропустить</button>
            <div>
              {stepIndex > 0 && <button onClick={() => setStepIndex((index) => index - 1)}>Назад</button>}
              <button
                className="tour-next"
                onClick={() => stepIndex === STEPS.length - 1 ? finish() : setStepIndex((index) => index + 1)}
              >
                {stepIndex === STEPS.length - 1 ? "Готово" : "Дальше"}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
