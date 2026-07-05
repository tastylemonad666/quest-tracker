import React, { useState, useMemo, useEffect } from 'react';
import { 
  Shield, Sword, ShoppingBag, User, Plus, Check, Trash2, 
  AlertTriangle, Clock, Award, Coins, Upload, Sparkles, 
  X, AlertCircle, CheckCircle2, TrendingUp, RefreshCw,
  Flame, Zap, Repeat, Calendar, Star, Crown, Trophy, 
  Lock, History, ChevronDown, ChevronUp, SlidersHorizontal
} from 'lucide-react';

// --- СПИСОК ВСЕХ 12 ДОСТИЖЕНИЙ ---
const ACHIEVEMENTS_LIST = [
  { id: 'first_step', title: 'Первые шаги', desc: 'Выполнить свой первый квест', icon: Sword },
  { id: 'task_10', title: 'Хват-трекер', desc: 'Выполнить суммарно 10 задач', icon: CheckCircle2 },
  { id: 'task_50', title: 'Мастер квестов', desc: 'Выполнить суммарно 50 задач', icon: Award },
  { id: 'streak_3', title: 'Горячая серия', desc: 'Удержать стрик активности 3 дня подряд', icon: Flame },
  { id: 'streak_7', title: 'Несгораемый', desc: 'Удержать стрик активности 7 дней подряд', icon: Flame },
  { id: 'streak_30', title: 'Легенда стрика', desc: 'Удержать стрик активности 30 дней подряд', icon: Flame },
  { id: 'lvl_5', title: 'Покоритель уровней', desc: 'Достичь 5 уровня персонажа', icon: Star },
  { id: 'lvl_10', title: 'Ветеран', desc: 'Достичь 10 уровня персонажа', icon: Crown },
  { id: 'first_buy', title: 'Первая покупка', desc: 'Приобрести первую награду в магазине', icon: ShoppingBag },
  { id: 'spender', title: 'Транжира', desc: 'Потратить суммарно 1000 монет в магазине', icon: Coins },
  { id: 'epic_hero', title: 'Эпический герой', desc: 'Успешно выполнить задачу эпической сложности', icon: Zap },
  { id: 'punctual', title: 'Пунктуальность', desc: 'Выполнить 10 задач вовремя (без просрочек)', icon: Clock },
];

// --- НАЧАЛЬНЫЕ ДАННЫЕ ---
const INITIAL_TASKS = [
  { id: 1, title: 'Выпить 2 литра воды', reward: 50, deadline: null, type: 'normal', difficulty: 'easy', recurrence: 'none', cooldownUntil: null },
  { id: 2, title: 'Завершить рабочий отчёт', reward: 300, deadline: new Date(Date.now() + 86400000).toISOString().slice(0, 16), type: 'normal', difficulty: 'hard', recurrence: 'none', cooldownUntil: null },
  { id: 3, title: 'Утренняя зарядка', reward: 100, deadline: new Date(Date.now() - 3600000).toISOString().slice(0, 16), type: 'normal', difficulty: 'medium', recurrence: 'daily', cooldownUntil: null },
  { id: 4, title: 'Прочитать 20 страниц книги', reward: 150, deadline: null, type: 'daily', difficulty: 'medium', recurrence: 'none', cooldownUntil: null },
  { id: 5, title: 'Генеральная уборка дома', reward: 500, deadline: null, type: 'weekly', difficulty: 'epic', recurrence: 'none', cooldownUntil: null },
];

const INITIAL_SHOP = [
  { id: 1, title: 'Чашка любимого кофе в кафе', price: 150 },
  { id: 2, title: '1 час игры в видеоигры', price: 200 },
  { id: 3, title: 'Покупка новой книги', price: 800 },
];

// --- НОВАЯ ЛОГИКА ВРЕМЕНИ (UTC+5 Екатеринбург) ---
const EKB_OFFSET_MS = 5 * 60 * 60 * 1000; // 5 часов в миллисекундах

// Получить текущую дату в ЕКБ в формате YYYY-MM-DD
const getEkbDateString = (offsetMs = 0) => {
  // Date.now() - абсолютное время. Прибавляем 5 часов и любое доп. смещение.
  const date = new Date(Date.now() + EKB_OFFSET_MS + offsetMs);
  return date.toISOString().slice(0, 10); 
};

// Получить точное время в UTC, когда наступит следующая полночь в Екатеринбурге
const getNextEkbMidnightMs = () => {
  const currentUtcMs = Date.now();
  const currentEkbMs = currentUtcMs + EKB_OFFSET_MS;
  const msInDay = 86400000;
  // Сколько миллисекунд прошло с начала текущего дня по ЕКБ
  const msSinceMidnight = currentEkbMs % msInDay;
  // Сколько миллисекунд осталось до следующей полуночи
  const msUntilMidnight = msInDay - msSinceMidnight;
  return currentUtcMs + msUntilMidnight;
};
// ------------------------------------------------

// Безопасная загрузка данных с миграцией старых сохранений
const loadFromStorage = (key, fallback) => {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return fallback;
    const parsed = JSON.parse(saved);
    
    if (key === 'quest_user') {
      return {
        ...parsed,
        xp: parsed.xp !== undefined ? parsed.xp : parsed.totalEarned || 250,
        streak: parsed.streak || { count: 1, lastDate: getEkbDateString() }, // Изменено на время ЕКБ
        unlockedAchievements: parsed.unlockedAchievements || [],
        stats: {
          completedTasks: parsed.stats?.completedTasks || 0,
          expiredTasks: parsed.stats?.expiredTasks || 0,
          totalSpent: parsed.stats?.totalSpent || 0,
          epicCompleted: parsed.stats?.epicCompleted || 0,
          onTimeCompleted: parsed.stats?.onTimeCompleted || 0,
        }
      };
    }
    return parsed;
  } catch (e) {
    return fallback;
  }
};

const calculateLevelInfo = (xp) => {
  let level = 1; let needed = 250; let accumulated = 0;
  while (xp >= accumulated + needed) {
    accumulated += needed; level++; needed = level * 250;
  }
  const currentXP = xp - accumulated;
  const percent = Math.min(100, Math.floor((currentXP / needed) * 100));

  let title = "Новичок";
  if (level >= 50) title = "Легенда";
  else if (level >= 30) title = "Грандмастер";
  else if (level >= 20) title = "Мастер";
  else if (level >= 10) title = "Герой";
  else if (level >= 5) title = "Искатель";

  return { level, currentXP, neededXP: needed, percent, title };
};

// Форматирование относительного времени для Ленты событий
const getRelativeTime = (isoString) => {
  const diffSec = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (diffSec < 60) return 'только что';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} мин. назад`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} ч. назад`;
  if (diffSec < 172800) return 'вчера';
  return `${Math.floor(diffSec / 86400)} дн. назад`;
};

export default function QuestTrackerApp() {
  const [activeTab, setActiveTab] = useState('tasks');
  const [sortType, setSortType] = useState('newest'); // Сортировка квестов
  const [showAllEvents, setShowAllEvents] = useState(false); // Раскрытие ленты событий
  
  const [user, setUser] = useState(() => loadFromStorage('quest_user', {
    name: 'Искатель Приключений', avatar: null, balance: 250, xp: 250, totalEarned: 250,
    streak: { count: 1, lastDate: getEkbDateString() }, // Изменено на время ЕКБ
    unlockedAchievements: [],
    stats: { completedTasks: 0, expiredTasks: 0, totalSpent: 0, epicCompleted: 0, onTimeCompleted: 0 }
  }));

  const [tasks, setTasks] = useState(() => loadFromStorage('quest_tasks', INITIAL_TASKS));
  const [shopItems, setShopItems] = useState(() => loadFromStorage('quest_shop', INITIAL_SHOP));
  const [events, setEvents] = useState(() => loadFromStorage('quest_events', []));

  const [modalState, setModalState] = useState({ type: null, data: null });
  const [toasts, setToasts] = useState([]);

  // --- АВТОСОХРАНЕНИЕ ---
  useEffect(() => { localStorage.setItem('quest_user', JSON.stringify(user)); }, [user]);
  useEffect(() => { localStorage.setItem('quest_tasks', JSON.stringify(tasks)); }, [tasks]);
  useEffect(() => { localStorage.setItem('quest_shop', JSON.stringify(shopItems)); }, [shopItems]);
  useEffect(() => { localStorage.setItem('quest_events', JSON.stringify(events)); }, [events]);

  const lvlInfo = useMemo(() => calculateLevelInfo(user.xp), [user.xp]);

  const addToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const addEventLog = (type, text) => {
    setEvents(prev => [{ id: Date.now(), type, text, time: new Date().toISOString() }, ...prev.slice(0, 49)]);
  };

  const isExpired = (deadline) => {
    if (!deadline) return false;
    return new Date(deadline).getTime() < Date.now();
  };

  // --- АВТОМАТИЧЕСКАЯ ПРОВЕРКА ДОСТИЖЕНИЙ ---
  const checkAchievements = (newUserData, newLevel) => {
    const unlocked = [...newUserData.unlockedAchievements];
    let addedNew = false;

    const conditions = {
      first_step: newUserData.stats.completedTasks >= 1,
      task_10: newUserData.stats.completedTasks >= 10,
      task_50: newUserData.stats.completedTasks >= 50,
      streak_3: newUserData.streak.count >= 3,
      streak_7: newUserData.streak.count >= 7,
      streak_30: newUserData.streak.count >= 30,
      lvl_5: newLevel >= 5,
      lvl_10: newLevel >= 10,
      first_buy: newUserData.stats.totalSpent > 0,
      spender: newUserData.stats.totalSpent >= 1000,
      epic_hero: newUserData.stats.epicCompleted >= 1,
      punctual: newUserData.stats.onTimeCompleted >= 10,
    };

    ACHIEVEMENTS_LIST.forEach(ach => {
      if (conditions[ach.id] && !unlocked.includes(ach.id)) {
        unlocked.push(ach.id);
        addedNew = true;
        addToast(`🏆 ДОСТИЖЕНИЕ РАЗБЛОКИРОВАНО: «${ach.title}»!`, 'success');
        addEventLog('achievement', `Разблокировано достижение «${ach.title}»!`);
      }
    });

    if (addedNew) {
      setUser(prev => ({ ...prev, unlockedAchievements: unlocked }));
    }
  };

  // --- ОБРАБОТЧИКИ ДЕЙСТВИЙ ---
  const handleCompleteTask = (task) => {
    const expired = task.type === 'normal' && isExpired(task.deadline);
    const currencyReward = expired ? Math.round(task.reward / 2) : task.reward;
    const xpReward = task.reward;

    const oldLevel = calculateLevelInfo(user.xp).level;
    const newXP = user.xp + xpReward;
    const newLevel = calculateLevelInfo(newXP).level;

    // ВЫЧИСЛЕНИЕ СТРИКА ПО ВРЕМЕНИ ЕКБ
    const today = getEkbDateString();
    const yesterday = getEkbDateString(-86400000); // Отнимаем 24 часа (в миллисекундах)
    
    let newStreakCount = user.streak.count;
    if (user.streak.lastDate === yesterday || user.streak.count === 0) {
      newStreakCount += 1;
    } else if (user.streak.lastDate !== today) {
      // Если последний раз был не сегодня и не вчера — стрик сбрасывается
      newStreakCount = 1;
    }

    const newStats = {
      completedTasks: user.stats.completedTasks + 1,
      expiredTasks: expired ? user.stats.expiredTasks + 1 : user.stats.expiredTasks,
      totalSpent: user.stats.totalSpent,
      epicCompleted: task.difficulty === 'epic' ? user.stats.epicCompleted + 1 : user.stats.epicCompleted,
      onTimeCompleted: !expired ? user.stats.onTimeCompleted + 1 : user.stats.onTimeCompleted,
    };

    const updatedUser = {
      ...user,
      balance: user.balance + currencyReward,
      xp: newXP,
      totalEarned: user.totalEarned + currencyReward,
      streak: { count: newStreakCount, lastDate: today },
      stats: newStats
    };

    setUser(updatedUser);

    // Логирование событий и уведомления
    addEventLog('task', `Выполнен квест «${task.title}» (${expired ? 'с опозданием' : 'вовремя'}): +${currencyReward} 💰, +${xpReward} ✨ XP`);

    if (newLevel > oldLevel) {
      addToast(`🎉 НОВЫЙ УРОВЕНЬ! Теперь вы «${calculateLevelInfo(newXP).title}» (Ур. ${newLevel})!`, 'success');
      addEventLog('level', `Достигнут Уровень ${newLevel} («${calculateLevelInfo(newXP).title}»)!`);
    } else {
      addToast(`Квест выполнен! +${currencyReward} 💰 | +${xpReward} ✨ XP`, expired ? 'warning' : 'success');
    }

    // Проверка ачивок
    setTimeout(() => checkAchievements(updatedUser, newLevel), 100);

    // УМНЫЙ СБРОС ЦИКЛИЧЕСКИХ КВЕСТОВ В 00:00 ПО ЕКБ
    if (task.type === 'daily' || task.type === 'weekly') {
      const midnightEkbMs = getNextEkbMidnightMs();
      // Для еженедельных квестов добавляем еще 6 дней к ближайшей полуночи
      const cooldownMs = task.type === 'daily' ? midnightEkbMs : midnightEkbMs + (6 * 86400000);
      
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, cooldownUntil: cooldownMs } : t));
    } else if (task.recurrence !== 'none') {
      const intervals = { daily: 86400000, weekly: 604800000, monthly: 2592000000 };
      const nextDeadline = task.deadline ? new Date(Date.now() + intervals[task.recurrence]).toISOString().slice(0, 16) : null;
      setTasks(prev => [...prev.filter(t => t.id !== task.id), { ...task, id: Date.now(), deadline: nextDeadline }]);
    } else {
      setTasks(prev => prev.filter(t => t.id !== task.id));
    }
    setModalState({ type: null, data: null });
  };

  const handleBuyItem = (item) => {
    if (user.balance < item.price) {
      addToast('Недостаточно монет для покупки!', 'error'); return;
    }
    const newTotalSpent = user.stats.totalSpent + item.price;
    const updatedUser = {
      ...user,
      balance: user.balance - item.price,
      stats: { ...user.stats, totalSpent: newTotalSpent }
    };
    setUser(updatedUser);
    setModalState({ type: null, data: null });
    addToast(`Приобретено: "${item.title}"! -${item.price} 💰`, 'success');
    addEventLog('shop', `Куплена награда «${item.title}» за ${item.price} 💰`);
    
    setTimeout(() => checkAchievements(updatedUser, calculateLevelInfo(user.xp).level), 100);
  };

  const handleAddTask = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const title = formData.get('title').trim();
    const reward = parseInt(formData.get('reward'), 10);
    const type = formData.get('type');
    const difficulty = formData.get('difficulty');
    const recurrence = type === 'normal' ? formData.get('recurrence') : 'none';
    const deadline = type === 'normal' && formData.get('deadline') ? formData.get('deadline') : null;

    if (!title || !reward || reward <= 0) return;
    setTasks(prev => [{ id: Date.now(), title, reward, type, difficulty, recurrence, deadline, cooldownUntil: null }, ...prev]);
    setModalState({ type: null, data: null });
    addToast('Новый квест добавлен в журнал!', 'success');
  };

  const handleAddShopItem = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const title = formData.get('title').trim();
    const price = parseInt(formData.get('price'), 10);

    if (!title || !price || price <= 0) return;
    setShopItems(prev => [{ id: Date.now(), title, price }, ...prev]);
    setModalState({ type: null, data: null });
    addToast('Товар добавлен в магазин!', 'success');
  };

  const deleteTask = (id) => { setTasks(prev => prev.filter(t => t.id !== id)); addToast('Квест удалён', 'error'); };
  const deleteShopItem = (id) => { setShopItems(prev => prev.filter(i => i.id !== id)); addToast('Товар удалён', 'error'); };

  const resetAllProgress = () => {
    if (window.confirm("Сбросить весь прогресс и начать сначала?")) {
      localStorage.clear();
      setUser({
        name: 'Искатель Приключений', avatar: null, balance: 250, xp: 250, totalEarned: 250,
        streak: { count: 1, lastDate: getEkbDateString() }, // И здесь тоже ЕКБ время
        unlockedAchievements: [],
        stats: { completedTasks: 0, expiredTasks: 0, totalSpent: 0, epicCompleted: 0, onTimeCompleted: 0 }
      });
      setTasks(INITIAL_TASKS); setShopItems(INITIAL_SHOP); setEvents([]);
      addToast('Прогресс сброшен!', 'warning');
    }
  };

  // --- СОРТИРОВКА ЗАДАЧ ---
  const diffWeights = { easy: 1, medium: 2, hard: 3, epic: 4 };

  const sortTasksList = (list) => {
    return [...list].sort((a, b) => {
      if (sortType === 'deadline') {
        if (!a.deadline && !b.deadline) return 0;
        if (!a.deadline) return 1; // Задачи без дедлайна отправляются в конец!
        if (!b.deadline) return -1;
        return new Date(a.deadline) - new Date(b.deadline);
      }
      if (sortType === 'difficultyDesc') return diffWeights[b.difficulty] - diffWeights[a.difficulty];
      if (sortType === 'difficultyAsc') return diffWeights[a.difficulty] - diffWeights[b.difficulty];
      if (sortType === 'rewardDesc') return b.reward - a.reward;
      if (sortType === 'oldest') return a.id - b.id;
      return b.id - a.id; // newest по умолчанию
    });
  };

  const normalTasks = useMemo(() => sortTasksList(tasks.filter(t => t.type === 'normal')), [tasks, sortType]);
  const cycleQuests = useMemo(() => sortTasksList(tasks.filter(t => t.type === 'daily' || t.type === 'weekly')), [tasks, sortType]);

  // ОБНОВЛЕННАЯ СТРОКА: ИСПОЛЬЗУЕМ ВРЕМЯ ЕКБ ДЛЯ ОТРИСОВКИ ОГОНЬКА СТРИКА
  const todayStr = getEkbDateString();
  const isStreakActiveToday = user.streak.lastDate === todayStr && user.streak.count > 0;
  
  const visibleEvents = showAllEvents ? events : events.slice(0, 5);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-20 selection:bg-purple-500 selection:text-white">
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* --- ШАПКА --- */}
      <header className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-md border-b border-purple-500/20 px-4 py-3 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          
          <div className="flex items-center gap-4 w-full sm:w-auto justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl shadow-[0_0_15px_rgba(168,85,247,0.4)]">
                <Shield className="w-6 h-6 text-white animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-black text-lg tracking-wider bg-gradient-to-r from-purple-400 via-cyan-400 to-indigo-400 bg-clip-text text-transparent">
                    КВЕСТ-ТРЕКЕР
                  </h1>
                  <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-purple-950 text-purple-300 border border-purple-800">
                    {lvlInfo.title}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-purple-300 font-medium mt-0.5">
                  <span className="font-bold text-white">Ур. {lvlInfo.level}</span>
                  <div className="w-20 sm:w-28 h-2 bg-slate-800 rounded-full overflow-hidden border border-purple-500/30">
                    <div className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 transition-all duration-500" style={{ width: `${lvlInfo.percent}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Мобильные счётчики */}
            <div className="flex sm:hidden items-center gap-2">
              <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-bold ${isStreakActiveToday ? 'bg-orange-500/20 text-orange-400 border-orange-500/40' : 'bg-slate-900 text-slate-500 border-slate-800'}`}>
                <Flame className={`w-3.5 h-3.5 ${isStreakActiveToday ? 'fill-orange-400 animate-bounce' : ''}`} />
                <span>{user.streak.count}</span>
              </div>
              <div className="flex items-center gap-1 bg-slate-950/80 border border-amber-500/40 px-2.5 py-1 rounded-full text-xs font-bold text-amber-400">
                <Coins className="w-3.5 h-3.5" />
                <span>{user.balance}</span>
              </div>
            </div>
          </div>

          {/* Навигация (4 вкладки) */}
          <nav className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800 w-full sm:w-auto justify-center">
            {[
              { id: 'tasks', label: 'Квесты', icon: Sword },
              { id: 'shop', label: 'Магазин', icon: ShoppingBag },
              { id: 'achievements', label: 'Достижения', icon: Trophy },
              { id: 'profile', label: 'Герой', icon: User },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium text-xs sm:text-sm transition-all duration-200 flex-1 sm:flex-initial justify-center ${
                    isActive 
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-[0_0_12px_rgba(168,85,247,0.5)]' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-300' : ''}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Десктопные счётчики */}
          <div className="hidden sm:flex items-center gap-3">
            <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-2xl border transition-all ${
              isStreakActiveToday ? 'bg-gradient-to-r from-orange-950/40 to-amber-950/40 border-orange-500/40 shadow-[0_0_15px_rgba(249,115,22,0.15)]' : 'bg-slate-950/80 border-slate-800 text-slate-500'
            }`}>
              <div className={`p-1 rounded-full ${isStreakActiveToday ? 'bg-orange-500/20' : 'bg-slate-800'}`}>
                <Flame className={`w-4 h-4 ${isStreakActiveToday ? 'text-orange-400 fill-orange-400 animate-pulse' : 'text-slate-600'}`} />
              </div>
              <div className="flex flex-col text-right">
                <span className="text-[9px] uppercase tracking-wider font-bold leading-none text-slate-400">Стрик</span>
                <span className={`font-black text-sm leading-tight ${isStreakActiveToday ? 'text-orange-400' : 'text-slate-500'}`}>{user.streak.count} дн.</span>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-slate-950/80 border border-amber-500/40 px-3.5 py-1.5 rounded-2xl shadow-[0_0_15px_rgba(245,158,11,0.15)]">
              <div className="p-1 bg-amber-500/10 rounded-full">
                <Coins className="w-4 h-4 text-amber-400 animate-bounce" style={{ animationDuration: '3s' }} />
              </div>
              <div className="flex flex-col text-right">
                <span className="text-[9px] text-slate-400 uppercase tracking-wider font-bold leading-none">Кошелёк</span>
                <span className="font-black text-amber-400 text-sm leading-tight">{user.balance} 💰</span>
              </div>
            </div>
          </div>

        </div>
      </header>

      {/* --- ОСНОВНОЙ КОНТЕНТ --- */}
      <main className="max-w-4xl mx-auto px-4 mt-8">
        
        {/* КВЕСТЫ */}
        {activeTab === 'tasks' && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-2 text-white">
                  <Sword className="text-purple-400" /> Журнал заданий
                </h2>
                <p className="text-slate-400 text-sm">Выполняйте задачи, получайте опыт ✨ и монеты 💰</p>
              </div>

              {/* Панель сортировки и кнопка добавления */}
              <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
                  <SlidersHorizontal className="w-4 h-4 text-slate-400 shrink-0" />
                  <select
                    value={sortType}
                    onChange={(e) => setSortType(e.target.value)}
                    className="bg-transparent text-xs font-bold text-slate-200 focus:outline-none cursor-pointer"
                  >
                    <option value="newest" className="bg-slate-900">Сначала новые</option>
                    <option value="deadline" className="bg-slate-900">По сроку (ближайшие)</option>
                    <option value="difficultyDesc" className="bg-slate-900">Сложность (Эпические)</option>
                    <option value="difficultyAsc" className="bg-slate-900">Сложность (Лёгкие)</option>
                    <option value="rewardDesc" className="bg-slate-900">По награде (Дорогие)</option>
                  </select>
                </div>

                <button
                  onClick={() => setModalState({ type: 'addTask', data: null })}
                  className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 text-white px-4 py-2.5 rounded-xl font-medium shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all transform active:scale-95 shrink-0"
                >
                  <Plus className="w-5 h-5" />
                  <span className="hidden sm:inline">Создать квест</span>
                </button>
              </div>
            </div>

            {/* Циклические квесты */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2 bg-cyan-950/30 border border-cyan-800/40 px-4 py-2 rounded-xl w-fit">
                <Calendar className="w-4 h-4" /> Циклические квесты (Ежедневные / Недельные)
              </h3>
              
              {cycleQuests.length === 0 ? (
                <div className="p-6 rounded-2xl border border-dashed border-slate-800 text-center text-slate-500 text-sm">
                  Нет активных ежедневных или еженедельных квестов.
                </div>
              ) : (
                <div className="grid gap-3">
                  {cycleQuests.map(task => {
                    const onCooldown = task.cooldownUntil && task.cooldownUntil > Date.now();
                    return (
                      <TaskCard 
                        key={task.id} task={task} onCooldown={onCooldown}
                        onDelete={() => deleteTask(task.id)}
                        onComplete={() => setModalState({ type: 'confirmTask', data: task })}
                      />
                    );
                  })}
                </div>
              )}
            </div>

            {/* Разовые задачи */}
            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-purple-400 flex items-center gap-2 bg-purple-950/30 border border-purple-800/40 px-4 py-2 rounded-xl w-fit">
                <Zap className="w-4 h-4" /> Разовые и регулярные задачи
              </h3>

              {normalTasks.length === 0 ? (
                <EmptyState icon={Sparkles} title="Список задач пуст" subtitle="Добавьте новые дела или отдохните!" />
              ) : (
                <div className="grid gap-3">
                  {normalTasks.map(task => (
                    <TaskCard 
                      key={task.id} task={task} isExpired={isExpired(task.deadline)}
                      onDelete={() => deleteTask(task.id)}
                      onComplete={() => setModalState({ type: 'confirmTask', data: task })}
                    />
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* МАГАЗИН */}
        {activeTab === 'shop' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-2 text-white">
                  <ShoppingBag className="text-cyan-400" /> Магазин наград
                </h2>
                <p className="text-slate-400 text-sm">Тратьте монеты 💰 на свои реальные удовольствия</p>
              </div>
              <button
                onClick={() => setModalState({ type: 'addShop', data: null })}
                className="flex items-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 text-white px-4 py-2.5 rounded-xl font-medium shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all transform active:scale-95"
              >
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">Добавить товар</span>
              </button>
            </div>

            {shopItems.length === 0 ? (
              <EmptyState icon={ShoppingBag} title="Ассортимент пуст" subtitle="Добавьте свои личные награды, чтобы мотивировать себя!" />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {shopItems.map(item => {
                  const canAfford = user.balance >= item.price;
                  return (
                    <div key={item.id} className="bg-slate-900/90 border border-slate-800 hover:border-cyan-500/40 p-5 rounded-2xl flex flex-col justify-between gap-4 transition-all hover:shadow-[0_0_20px_rgba(6,182,212,0.15)] group">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-lg text-slate-100 group-hover:text-cyan-300 transition-colors">{item.title}</h3>
                        <button onClick={() => deleteShopItem(item.id)} className="text-slate-600 hover:text-red-400 p-1"><Trash2 className="w-4 h-4" /></button>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
                        <div className="flex items-center gap-1.5 font-black text-amber-400 text-lg">
                          <Coins className="w-5 h-5" /><span>{item.price} 💰</span>
                        </div>
                        <button
                          disabled={!canAfford}
                          onClick={() => setModalState({ type: 'confirmBuy', data: item })}
                          className={`px-5 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                            canAfford ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)] active:scale-95' : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                          }`}
                        >
                          <span>{canAfford ? 'Купить' : 'Не хватает 💰'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* --- НОВАЯ ВКЛАДКА: ДОСТИЖЕНИЯ --- */}
        {activeTab === 'achievements' && (
          <div className="space-y-10">
            
            {/* БЛОК А: Ачивки */}
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-2 text-white">
                  <Trophy className="text-amber-400" /> Зал славы и достижения
                </h2>
                <p className="text-slate-400 text-sm">
                  Разблокировано ачивок: <span className="font-bold text-amber-400">{user.unlockedAchievements.length} из {ACHIEVEMENTS_LIST.length}</span>
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {ACHIEVEMENTS_LIST.map(ach => {
                  const isUnlocked = user.unlockedAchievements.includes(ach.id);
                  const Icon = ach.icon;
                  return (
                    <div
                      key={ach.id}
                      className={`relative p-4 rounded-2xl border flex flex-col justify-between gap-3 transition-all duration-300 ${
                        isUnlocked 
                          ? 'border-amber-500/50 bg-gradient-to-br from-amber-950/20 via-slate-900 to-slate-900 shadow-[0_0_20px_rgba(245,158,11,0.15)] hover:-translate-y-1' 
                          : 'border-slate-800/80 bg-slate-950/60 opacity-60 grayscale'
                      }`}
                    >
                      {!isUnlocked && (
                        <div className="absolute top-3 right-3 p-1 bg-slate-900 rounded-lg border border-slate-800">
                          <Lock className="w-3.5 h-3.5 text-slate-500" />
                        </div>
                      )}

                      <div className="space-y-2">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                          isUnlocked ? 'bg-amber-500/20 border-amber-500/40 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.3)]' : 'bg-slate-900 border-slate-800 text-slate-600'
                        }`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <h3 className={`font-bold text-sm leading-tight ${isUnlocked ? 'text-white' : 'text-slate-400'}`}>
                          {ach.title}
                        </h3>
                      </div>

                      <p className="text-[11px] text-slate-400 leading-relaxed border-t border-slate-800/60 pt-2">
                        {ach.desc}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* БЛОК Б: Лента событий */}
            <div className="space-y-4 pt-4 border-t border-slate-800/80">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold flex items-center gap-2 text-white">
                  <History className="text-purple-400 w-5 h-5" /> Лента событий
                </h3>
                <span className="text-xs text-slate-500">Записи активности героического пути</span>
              </div>

              {events.length === 0 ? (
                <EmptyState icon={History} title="Пока нет событий" subtitle="Начните выполнять квесты и покупать награды — история появится здесь!" />
              ) : (
                <div className="space-y-2 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4">
                  {visibleEvents.map(ev => {
                    const iconMap = { task: Sword, shop: ShoppingBag, level: Star, achievement: Trophy };
                    const Icon = iconMap[ev.type] || Sword;
                    const colorMap = { task: 'text-emerald-400 bg-emerald-500/10', shop: 'text-cyan-400 bg-cyan-500/10', level: 'text-purple-400 bg-purple-500/10', achievement: 'text-amber-400 bg-amber-500/10' };
                    
                    return (
                      <div key={ev.id} className="flex items-center justify-between gap-4 p-3 rounded-xl bg-slate-900/80 border border-slate-800/60 text-xs">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg shrink-0 ${colorMap[ev.type]}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className="text-slate-200 font-medium">{ev.text}</span>
                        </div>
                        <span className="text-slate-500 text-[11px] shrink-0">{getRelativeTime(ev.time)}</span>
                      </div>
                    );
                  })}

                  {events.length > 5 && (
                    <button
                      onClick={() => setShowAllEvents(!showAllEvents)}
                      className="w-full mt-2 py-2.5 flex items-center justify-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-xl border border-slate-800 transition-colors"
                    >
                      <span>{showAllEvents ? 'Свернуть историю' : `Показать ещё (${events.length - 5})`}</span>
                      {showAllEvents ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              )}
            </div>

          </div>
        )}

        {/* ПРОФИЛЬ */}
        {activeTab === 'profile' && (
          <div className="space-y-6 max-w-2xl mx-auto">
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
              <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-purple-500/10 rounded-full blur-2xl" />
              
              <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-slate-800">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-full border-2 border-purple-500/50 overflow-hidden bg-slate-950 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.3)]">
                    {user.avatar ? <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" /> : <span className="text-4xl font-black text-purple-400">{user.name[0].toUpperCase()}</span>}
                  </div>
                  <label className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                    <Upload className="w-6 h-6 text-white" />
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => setUser(prev => ({ ...prev, avatar: reader.result }));
                        reader.readAsDataURL(file);
                      }
                    }} />
                  </label>
                </div>

                <div className="flex-1 text-center sm:text-left w-full">
                  <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                    <span className="text-xs text-purple-400 font-bold uppercase tracking-wider block">Имя персонажа</span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow">
                      <Crown className="w-3 h-3" /> {lvlInfo.title}
                    </span>
                  </div>
                  <input
                    type="text" value={user.name}
                    onChange={(e) => setUser(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-purple-500 rounded-xl px-4 py-2 text-lg font-bold text-white focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>
              </div>

              {/* Шкала Опыта и Уровня */}
              <div className="my-6 p-5 bg-slate-950/60 rounded-2xl border border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.1)]">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-white flex items-center gap-2"><Star className="w-5 h-5 text-purple-400 fill-purple-400" /> Уровень {lvlInfo.level}</span>
                  <span className="text-xs font-bold text-purple-300">{lvlInfo.currentXP} / {lvlInfo.neededXP} XP</span>
                </div>
                <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800 p-0.5">
                  <div className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-cyan-400 rounded-full transition-all duration-500" style={{ width: `${lvlInfo.percent}%` }} />
                </div>
              </div>

              {/* Баланс и Стрик */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-6">
                <div className="p-6 text-center bg-gradient-to-b from-slate-950/40 to-slate-950/80 rounded-2xl border border-amber-500/20">
                  <span className="text-xs font-bold text-amber-500 uppercase tracking-widest block mb-1">Кошелёк наград</span>
                  <div className="flex items-center justify-center gap-2">
                    <Coins className="w-8 h-8 text-amber-400" />
                    <span className="text-4xl font-black text-amber-400">{user.balance}</span>
                    <span className="text-lg font-bold text-amber-600 self-end mb-1">💰</span>
                  </div>
                </div>

                <div className="p-6 text-center bg-gradient-to-b from-slate-950/40 to-slate-950/80 rounded-2xl border border-orange-500/20">
                  <span className="text-xs font-bold text-orange-400 uppercase tracking-widest block mb-1">Стрик активности</span>
                  <div className="flex items-center justify-center gap-2">
                    <Flame className={`w-8 h-8 text-orange-400 ${isStreakActiveToday ? 'fill-orange-400 animate-bounce' : ''}`} />
                    <span className="text-4xl font-black text-orange-400">{user.streak.count}</span>
                    <span className="text-sm font-bold text-orange-600 self-end mb-1.5">дней</span>
                  </div>
                </div>
              </div>

              {/* Статистика */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <StatCard icon={Award} title="Всего добыто монет" value={`${user.totalEarned} 💰`} color="text-amber-400" borderColor="border-amber-500/20" />
                <StatCard icon={CheckCircle2} title="Выполнено квестов" value={user.stats.completedTasks} color="text-emerald-400" borderColor="border-emerald-500/20" />
                <StatCard icon={TrendingUp} title="С опозданием" value={user.stats.expiredTasks} color="text-red-400" borderColor="border-red-500/20" />
              </div>

              <div className="pt-4 border-t border-slate-800 text-center">
                <button onClick={resetAllProgress} className="inline-flex items-center gap-2 text-xs text-red-400 hover:text-red-300 px-4 py-2 rounded-xl transition-colors">
                  <RefreshCw className="w-3.5 h-3.5" /><span>Сбросить весь прогресс и начать сначала</span>
                </button>
              </div>

            </div>
          </div>
        )}
      </main>

      {/* ПЛАВАЮЩАЯ КНОПКА (МОБИЛЬНЫЕ) */}
      {activeTab !== 'profile' && activeTab !== 'achievements' && (
        <button
          onClick={() => setModalState({ type: activeTab === 'tasks' ? 'addTask' : 'addShop', data: null })}
          className="sm:hidden fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.6)] z-20 active:scale-90"
        >
          <Plus className="w-7 h-7" />
        </button>
      )}

      {/* УВЕДОМЛЕНИЯ */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map(toast => (
          <div key={toast.id} className={`pointer-events-auto flex items-center gap-3 p-4 rounded-xl border shadow-2xl backdrop-blur-md transition-all ${
            toast.type === 'success' ? 'bg-slate-900/95 border-emerald-500/50 text-emerald-300' :
            toast.type === 'warning' ? 'bg-slate-900/95 border-amber-500/50 text-amber-300' : 'bg-slate-900/95 border-red-500/50 text-red-300'
          }`}>
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
            {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />}
            <span className="text-sm font-medium text-slate-100">{toast.message}</span>
          </div>
        ))}
      </div>

      {/* --- МОДАЛЬНОЕ ОКНО СОЗДАНИЯ ЗАДАЧИ --- */}
      {modalState.type === 'addTask' && (
        <CreateTaskModal onClose={() => setModalState({ type: null, data: null })} onSubmit={handleAddTask} />
      )}

      {/* МОДАЛКИ ПОДТВЕРЖДЕНИЙ */}
      {modalState.type === 'confirmTask' && (
        <ModalWrapper onClose={() => setModalState({ type: null, data: null })} title="Завершение квеста">
          <div className="space-y-4">
            <p className="text-slate-300">Подтвердите выполнение квеста <span className="text-white font-bold">«{modalState.data?.title}»</span>.</p>
            
            {modalState.data?.type === 'normal' && isExpired(modalState.data?.deadline) && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-start gap-3 text-amber-300 text-xs">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                <span>Срок истёк! Валюта будет уменьшена вдвое (+{Math.round(modalState.data?.reward / 2)} 💰), но <strong>опыт (+{modalState.data?.reward} ✨ XP) начислится полностью!</strong></span>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button onClick={() => setModalState({ type: null, data: null })} className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-sm">Отмена</button>
              <button onClick={() => handleCompleteTask(modalState.data)} className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-[0_0_15px_rgba(16,185,129,0.4)]">Завершить</button>
            </div>
          </div>
        </ModalWrapper>
      )}

      {modalState.type === 'addShop' && (
        <ModalWrapper onClose={() => setModalState({ type: null, data: null })} title="Новая награда">
          <form onSubmit={handleAddShopItem} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Название награды *</label>
              <input required name="title" type="text" placeholder="Например: Поход в кино" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Стоимость (💰) *</label>
              <input required name="price" type="number" min="1" placeholder="500" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500" />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button type="button" onClick={() => setModalState({ type: null, data: null })} className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-sm">Отмена</button>
              <button type="submit" className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-[0_0_15px_rgba(6,182,212,0.4)]">Добавить</button>
            </div>
          </form>
        </ModalWrapper>
      )}

      {modalState.type === 'confirmBuy' && (
        <ModalWrapper onClose={() => setModalState({ type: null, data: null })} title="Покупка">
          <div className="space-y-4">
            <p className="text-slate-300">Купить <span className="text-white font-bold">«{modalState.data?.title}»</span> за <span className="text-amber-400 font-bold">{modalState.data?.price} 💰</span>?</p>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button onClick={() => setModalState({ type: null, data: null })} className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-sm">Отмена</button>
              <button onClick={() => handleBuyItem(modalState.data)} className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-[0_0_15px_rgba(6,182,212,0.4)]">Купить</button>
            </div>
          </div>
        </ModalWrapper>
      )}

    </div>
  );
}

// --- КОМПОНЕНТ КАРТОЧКИ ЗАДАЧИ ---
function TaskCard({ task, isExpired, onCooldown, onDelete, onComplete }) {
  const diffStyles = {
    easy: { label: 'Лёгкая', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
    medium: { label: 'Средняя', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' },
    hard: { label: 'Сложная', color: 'bg-orange-500/10 text-orange-400 border-orange-500/30' },
    epic: { label: 'Эпическая', color: 'bg-purple-500/20 text-purple-300 border-purple-500/50 shadow-[0_0_12px_rgba(168,85,247,0.3)]' },
  }[task.difficulty || 'easy'];

  const recLabels = { daily: 'Каждый день', weekly: 'Каждую неделю', monthly: 'Каждый месяц' };

  return (
    <div className={`group relative bg-slate-900/90 border p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-300 ${
      onCooldown ? 'opacity-50 border-slate-800 bg-slate-950/40' :
      isExpired ? 'border-red-500/50 bg-gradient-to-r from-red-950/20 to-slate-900' : 'border-slate-800 hover:border-purple-500/40'
    }`}>
      <div className="space-y-2 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${diffStyles.color}`}>
            {diffStyles.label}
          </span>
          {task.type !== 'normal' && (
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
              {task.type === 'daily' ? 'Ежедневный квест' : 'Недельный квест'}
            </span>
          )}
          {task.recurrence !== 'none' && (
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 flex items-center gap-1">
              <Repeat className="w-3 h-3" /> Повторяется: {recLabels[task.recurrence]}
            </span>
          )}
        </div>

        <h3 className={`font-semibold text-lg ${isExpired ? 'text-red-200' : 'text-slate-100'}`}>
          {task.title}
        </h3>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {task.type === 'normal' && task.deadline && (
            <span className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium ${
              isExpired ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-slate-800 text-slate-300'
            }`}>
              {isExpired ? <AlertTriangle className="w-3.5 h-3.5 text-red-400" /> : <Clock className="w-3.5 h-3.5 text-cyan-400" />}
              {isExpired ? 'ПРОСРОЧЕНО (-50% валюты)' : `До: ${task.deadline.replace('T', ' ')}`}
            </span>
          )}

          <span className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-md font-bold">
            <span className="text-amber-400 flex items-center gap-1">+{isExpired ? Math.round(task.reward / 2) : task.reward} 💰</span>
            <span className="text-purple-400 flex items-center gap-1">+{task.reward} ✨ XP</span>
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-center">
        <button onClick={onDelete} className="p-2.5 text-slate-500 hover:text-red-400 rounded-xl transition-colors"><Trash2 className="w-5 h-5" /></button>
        {onCooldown ? (
          <div className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-400 text-xs font-bold border border-slate-700">
            Перезарядка...
          </div>
        ) : (
          <button onClick={onComplete} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-bold shadow-[0_0_15px_rgba(16,185,129,0.3)] active:scale-95">
            <Check className="w-5 h-5" /><span>Готово</span>
          </button>
        )}
      </div>
    </div>
  );
}

// --- УМНОЕ МОДАЛЬНОЕ ОКНО СОЗДАНИЯ ЗАДАЧИ ---
function CreateTaskModal({ onClose, onSubmit }) {
  const [taskType, setTaskType] = useState('normal');

  return (
    <ModalWrapper onClose={onClose} title="Создание нового квеста">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Тип задания</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'normal', label: 'Обычное' },
              { id: 'daily', label: 'Ежедневное' },
              { id: 'weekly', label: 'Еженедельное' }
            ].map(t => (
              <button
                key={t.id} type="button" onClick={() => setTaskType(t.id)}
                className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                  taskType === t.id ? 'bg-purple-600 border-purple-500 text-white shadow-[0_0_10px_rgba(168,85,247,0.4)]' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <input type="hidden" name="type" value={taskType} />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Название *</label>
          <input required name="title" type="text" placeholder="Что нужно сделать?" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white focus:border-purple-500 focus:outline-none" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Награда (💰 и ✨ XP) *</label>
            <input required name="reward" type="number" min="1" defaultValue="100" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white focus:border-purple-500 focus:outline-none" />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Сложность</label>
            <select name="difficulty" defaultValue="easy" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-purple-500 focus:outline-none text-sm">
              <option value="easy">🟢 Лёгкая</option>
              <option value="medium">🟡 Средняя</option>
              <option value="hard">🟠 Сложная</option>
              <option value="epic">🟣 Эпическая</option>
            </select>
          </div>
        </div>

        {taskType === 'normal' && (
          <>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Срок (Дедлайн)</label>
              <input name="deadline" type="datetime-local" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-slate-300 focus:border-purple-500 focus:outline-none text-sm" />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Повторяемость рутины</label>
              <select name="recurrence" defaultValue="none" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:border-purple-500 focus:outline-none text-sm">
                <option value="none">Одноразовая задача</option>
                <option value="daily">🔁 Создавать новую каждый день</option>
                <option value="weekly">🔁 Создавать новую каждую неделю</option>
                <option value="monthly">🔁 Создавать новую каждый месяц</option>
              </select>
            </div>
          </>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-sm">Отмена</button>
          <button type="submit" className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-[0_0_15px_rgba(168,85,247,0.4)]">Создать квест</button>
        </div>
      </form>
    </ModalWrapper>
  );
}

function EmptyState({ icon: Icon, title, subtitle }) {
  return (
    <div className="text-center py-12 px-4 bg-slate-900/40 border border-slate-800/80 rounded-3xl flex flex-col items-center justify-center">
      <div className="p-4 bg-slate-800/50 rounded-2xl mb-3 border border-slate-700/50"><Icon className="w-8 h-8 text-slate-500" /></div>
      <h3 className="text-base font-bold text-slate-300 mb-1">{title}</h3>
      <p className="text-xs text-slate-500 max-w-sm">{subtitle}</p>
    </div>
  );
}

function StatCard({ icon: Icon, title, value, color, borderColor }) {
  return (
    <div className={`bg-slate-950/60 border ${borderColor} p-4 rounded-2xl flex items-center gap-4`}>
      <div className={`p-3 rounded-xl bg-slate-900 ${color}`}><Icon className="w-6 h-6" /></div>
      <div><span className="text-xs text-slate-400 font-medium block">{title}</span><span className="text-lg font-black text-slate-100">{value}</span></div>
    </div>
  );
}

function ModalWrapper({ children, onClose, title }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-6 shadow-2xl relative" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
          <h3 className="font-bold text-lg text-white">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"><X className="w-5 h-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}