import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { questions } from '../../content/questions';
import { answerQuestion, correctCount, createRun, isComplete, nextQuestion, QUIZ_LENGTH, QUIZ_STORAGE_KEY, restoreRun } from './engine';
import { AvocadoPlant } from './AvocadoPlant';
import { SceneMagic } from '../../components/SceneMagic';
import { QuizVictoryCinematic } from './QuizVictoryCinematic';
import { asset } from '../../content/world';
import { markPortalCompleted } from '../../content/portalProgress';
import './quiz.css';

function loadRun() {
  try { return restoreRun(localStorage.getItem(QUIZ_STORAGE_KEY)) ?? createRun(); }
  catch { return createRun(); }
}

export function AvocadoQuiz({ onExit }: { onExit: () => void }) {
  const [run, setRun] = useState(loadRun);
  const [showCinematic, setShowCinematic] = useState(false);
  const title = useRef<HTMLHeadingElement>(null);
  const next = useRef<HTMLButtonElement>(null);
  const previousIndex = useRef(run.index);
  const finished = isComplete(run);
  const answered = !finished && run.answers.length > run.index;
  const card = run.cards[run.index];
  const question = card && questions.find(q => q.id === card.id)!;
  const score = correctCount(run);

  // Preload victory cinematic images
  useEffect(() => {
    ['quiz/quiz-shell.png', 'quiz/quiz-mark.png'].forEach(path => {
      const img = new Image();
      img.src = asset(path);
    });
  }, []);

  useEffect(() => {
    try { localStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify(run)); } catch { /* The game also works without storage. */ }
    if (correctCount(run) >= QUIZ_LENGTH) {
      markPortalCompleted('little-magic');
    }
  }, [run]);
  useEffect(() => {
    if (previousIndex.current !== run.index) title.current?.focus();
    previousIndex.current = run.index;
  }, [run.index]);
  useEffect(() => { if (answered) next.current?.focus(); }, [answered]);

  return <section className="avocado-quiz" aria-label="Викторина с авокадо">
    {showCinematic && <QuizVictoryCinematic
      onRestart={() => { setShowCinematic(false); setRun(createRun()); }}
      onExit={onExit}
    />}
    <div className="quiz-layout">
      <aside className={`quiz-garden ${finished ? 'quiz-garden--complete' : ''}`}>
        <SceneMagic variant="garden"/>
        <div className="quiz-garden-frame" aria-hidden="true"/>
        <AvocadoPlant growth={[0, 4, 8, 10][score] ?? 10}/>
        {score > 0 && <div key={score} className="quiz-growth-bloom" aria-hidden="true">{Array.from({ length: 8 }, (_, i) => <span key={i} style={{ '--bloom-angle': `${i * 45}deg` } as CSSProperties}/>)}</div>}
        <div className="quiz-growth" role="progressbar" aria-label="Рост растения за правильные ответы" aria-valuemin={0} aria-valuemax={QUIZ_LENGTH} aria-valuenow={score}>
          {Array.from({ length: QUIZ_LENGTH }, (_, i) => <span key={i} className={i < score ? 'is-filled' : ''}/>)}
        </div>
      </aside>
      <div className="quiz-paper">
        {finished ? <div className="quiz-finish" key="finish">
          <h2 id="chapter-title" ref={title} tabIndex={-1}>Смотри,<br/>какой вырос.</h2>
          <button className="quiz-next" onClick={() => setRun(createRun())}>Вырастить ещё один <span aria-hidden="true">↗</span></button>
          <button className="quiz-return" onClick={onExit}>Вернуться к дверям</button>
        </div> : <div className="quiz-question" key={run.index}>
          <h2 id="chapter-title" ref={title} tabIndex={-1}>{question.prompt}</h2>
          <div className="quiz-answers" role="group" aria-label="Варианты ответа">
            {card.order.map((option, position) => {
              const correct = answered && option === question.answer;
              const selected = answered && run.answers[run.index] === position;
              return <button key={position} disabled={answered} className={`quiz-answer ${correct ? 'quiz-answer--correct' : ''} ${selected ? 'quiz-answer--selected' : ''}`} onClick={() => setRun(current => answerQuestion(current, position))}>
                <span className="quiz-answer-letter" aria-hidden="true">{['А', 'Б', 'В'][position]}</span><span>{question.options[option]}</span>{correct && <span className="quiz-answer-check" aria-label="Правильный ответ">✓</span>}
              </button>;
            })}
          </div>
          {answered && <button ref={next} className="quiz-next" onClick={() => {
            if (score === QUIZ_LENGTH) { setShowCinematic(true); }
            else setRun(nextQuestion);
          }}>{score === QUIZ_LENGTH ? 'Посмотреть, что выросло' : 'Следующий вопрос'}<span aria-hidden="true">→</span></button>}
        </div>}
        <span className="quiz-paper-corner" aria-hidden="true">❋</span>
      </div>
    </div>
  </section>;
}
