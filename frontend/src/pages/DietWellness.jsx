import React, { useEffect, useState } from 'react';
import { Apple, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ErrorState } from '../components/ui/ErrorState';
import { LoadingState } from '../components/ui/LoadingState';
import './pages.css';

const MEAL_TYPES = ['breakfast', 'mid_morning', 'lunch', 'evening_snack', 'dinner'];
const today = () => new Date().toISOString().slice(0, 10);

export const DietWellness = () => {
  const [plan, setPlan] = useState(null);
  const [logs, setLogs] = useState([]);
  const [mealsCompleted, setMealsCompleted] = useState([]);
  const [waterConsumedLiters, setWaterConsumedLiters] = useState('0');
  const [calorieIntake, setCalorieIntake] = useState('0');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/diet/my-plan', { requireAuth: true }),
      api.get('/diet/logs?days=30', { requireAuth: true }),
    ])
      .then(([activePlan, dietLogs]) => {
        setPlan(activePlan);
        setLogs(dietLogs);
        const todayLog = dietLogs.find((log) => new Date(log.date).toDateString() === new Date().toDateString());
        if (todayLog) {
          setMealsCompleted(todayLog.mealsCompleted || []);
          setWaterConsumedLiters(String(todayLog.waterConsumedLiters ?? 0));
          setCalorieIntake(String(todayLog.calorieIntake ?? 0));
        }
      })
      .catch((error) => setErrorMessage(error.message || 'Unable to load your diet plan.'))
      .finally(() => setIsLoading(false));
  }, []);

  const toggleMeal = (meal) => {
    setMealsCompleted((current) => (
      current.includes(meal) ? current.filter((value) => value !== meal) : [...current, meal]
    ));
  };

  const saveDailyLog = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setIsSaving(true);
    try {
      const savedLog = await api.post('/diet/log', {
        date: today(),
        dietPlanId: plan?._id,
        mealsCompleted,
        waterConsumedLiters: Number(waterConsumedLiters),
        calorieIntake: Number(calorieIntake),
      }, { requireAuth: true });
      setLogs((current) => [
        savedLog,
        ...current.filter((log) => new Date(log.date).toDateString() !== new Date(savedLog.date).toDateString()),
      ]);
      setSuccessMessage('Today’s demo diet log was saved.');
    } catch (error) {
      setErrorMessage(error.message || 'Unable to save today’s diet log.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="dashboard-page"><LoadingState count={2} type="card" /></div>;
  if (errorMessage && !plan) {
    return (
      <div className="dashboard-page">
        <ErrorState title="Diet Plan Unavailable" message={errorMessage} />
      </div>
    );
  }

  return (
    <div className="dashboard-page fade-in">
      <div className="page-header">
        <div>
          <h2 className="page-title">Diet & Wellness</h2>
          <p className="page-subtitle">Review your plan and keep a personal daily adherence log.</p>
        </div>
      </div>

      {errorMessage && <div className="upload-alert error" role="alert"><AlertCircle size={18} />{errorMessage}</div>}
      {successMessage && <div className="upload-alert success" role="status"><CheckCircle2 size={18} />{successMessage}</div>}

      {plan ? (
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Apple size={24} aria-hidden="true" />
            <div>
              <h3 style={{ margin: 0 }}>{plan.title}</h3>
              <p style={{ color: 'var(--text-muted)', margin: '0.3rem 0' }}>{plan.condition} · {plan.goal?.replace('_', ' ')}</p>
            </div>
          </div>
          {plan.title?.includes('DEMO DATA') && (
            <p className="badge badge-neutral" style={{ marginTop: '0.75rem' }}>DEMO DATA — fictional example, not personal medical advice</p>
          )}
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
            {plan.dailyCalorieTarget != null && <span>Example daily target: {plan.dailyCalorieTarget} kcal</span>}
            {plan.waterIntakeTargetLiters != null && <span>Example water target: {plan.waterIntakeTargetLiters} L</span>}
            {plan.prescribedBy?.name && <span>Plan by: {plan.prescribedBy.name}</span>}
          </div>
          {(plan.meals || []).map((meal) => (
            <div key={`${meal.mealType}-${meal.time}`} style={{ marginTop: '1rem' }}>
              <strong>{meal.mealType.replace('_', ' ')}{meal.time ? ` · ${meal.time}` : ''}</strong>
              <ul>
                {(meal.items || []).map((item, index) => (
                  <li key={`${item.name}-${index}`}>{item.name}{item.portion ? ` (${item.portion})` : ''}</li>
                ))}
              </ul>
            </div>
          ))}
          {plan.guidelines?.map((guideline) => <p key={guideline} style={{ color: 'var(--text-muted)' }}>{guideline}</p>)}
        </Card>
      ) : (
        <Card><p>No active diet plan is available for this account.</p></Card>
      )}

      <Card style={{ marginTop: '1rem' }}>
        <h3>Today’s Diet Log</h3>
        <form className="auth-form" onSubmit={saveDailyLog}>
          <fieldset>
            <legend>Meals completed</legend>
            {MEAL_TYPES.map((meal) => (
              <label key={meal} style={{ display: 'inline-flex', gap: '0.4rem', margin: '0.5rem 1rem 0.5rem 0' }}>
                <input type="checkbox" checked={mealsCompleted.includes(meal)} onChange={() => toggleMeal(meal)} />
                {meal.replace('_', ' ')}
              </label>
            ))}
          </fieldset>
          <div className="form-group">
            <label htmlFor="waterConsumed">Water consumed (L)</label>
            <input id="waterConsumed" className="form-input" type="number" min="0" step="0.1" value={waterConsumedLiters} onChange={(event) => setWaterConsumedLiters(event.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="calorieIntake">Calories logged</label>
            <input id="calorieIntake" className="form-input" type="number" min="0" step="1" value={calorieIntake} onChange={(event) => setCalorieIntake(event.target.value)} />
          </div>
          <Button type="submit" variant="primary" disabled={isSaving}>{isSaving ? 'Saving…' : 'Save today’s log'}</Button>
        </form>
      </Card>

      <div style={{ marginTop: '1rem' }}>
        <h3>Recent adherence logs</h3>
        {logs.length ? logs.map((log) => (
          <Card key={log._id} style={{ marginBottom: '0.75rem' }}>
            <strong>{new Date(log.date).toLocaleDateString()}</strong>
            <p>{log.mealsCompleted?.length || 0} meals logged · {log.waterConsumedLiters || 0} L water · {log.calorieIntake || 0} kcal</p>
            {log.notes?.includes('DEMO DATA') && <span className="badge badge-neutral">DEMO DATA</span>}
          </Card>
        )) : <Card><p>No diet logs yet.</p></Card>}
      </div>
    </div>
  );
};
