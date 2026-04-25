import { useState, useEffect, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";

// ═══════════════════════════════════════════
// GAME CONSTANTS
// ═══════════════════════════════════════════

const getToday = () => new Date().toISOString().split("T")[0];
const getWeekKey = () => { const d = new Date(), j = new Date(d.getFullYear(),0,1); return `${d.getFullYear()}-W${Math.ceil(((d-j)/86400000+j.getDay()+1)/7)}`; };

const KINGDOMS = [
  { id:1, name:"The Cursed Marsh",      range:"94–85 kg", minW:85, icon:"🌑", color:"#4a1942", accent:"#c084fc", bg:"#1a0a1a", desc:"Dark. Heavy. Foggy. The chains of the old life bind you here. Every step costs twice the effort. But you chose to rise.", textColor:"#e9d5ff" },
  { id:2, name:"The Whispering Forest", range:"85–75 kg", minW:75, icon:"🌿", color:"#14532d", accent:"#4ade80", bg:"#0a1a0f", desc:"The fog begins to lift. You hear birds. Your legs are lighter. The trees whisper — she is becoming.", textColor:"#bbf7d0" },
  { id:3, name:"The Iron Mountains",    range:"75–65 kg", minW:65, icon:"⛰️", color:"#1c1917", accent:"#fb923c", bg:"#0f0a06", desc:"Brutal terrain. But you are no longer who you were. Each summit conquered reshapes you into steel.", textColor:"#fed7aa" },
  { id:4, name:"The Sunlit Valley",     range:"65–55 kg", minW:55, icon:"☀️", color:"#713f12", accent:"#fbbf24", bg:"#0f0800", desc:"The transformation is visible to all. Powers you forgot you had are awakening. You move like fire.", textColor:"#fef3c7" },
  { id:5, name:"The Crystal Kingdom",   range:"55–48 kg", minW:0,  icon:"💎", color:"#1e3a5f", accent:"#60a5fa", bg:"#040d1a", desc:"The final realm. Legendary warriors only. The Shadow Self awaits. Defeat it and claim your true form.", textColor:"#bfdbfe" },
];

const getKingdom = (w) => KINGDOMS.find(k => w > k.minW) || KINGDOMS[4];

// Battle Week Engine — 6 battle days + 1 recharge, IST based
const getISTDate = () => {
  const now = new Date();
  const ist = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
  return ist.toISOString().split("T")[0];
};

const getDayDates = (offset=0) => {
  const result = [];
  const d = new Date();
  const dow = d.getDay();
  d.setDate(d.getDate() - ((dow+6)%7) - (offset*7));
  for(let i=0;i<7;i++){
    result.push(d.toISOString().split("T")[0]);
    d.setDate(d.getDate()+1);
  }
  return result;
};

const getBattleWeekInfo = (startDate) => {
  if (!startDate) return null;
  const start = new Date(startDate);
  const today = new Date(getISTDate());
  const diffDays = Math.floor((today - start) / 86400000);
  if (diffDays < 0) return null;
  const weekNum = Math.floor(diffDays / 7) + 1;
  const dayInCycle = diffDays % 7; // 0-5 = battle, 6 = recharge
  const weekStart = new Date(start);
  weekStart.setDate(start.getDate() + (weekNum - 1) * 7);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 5);
  const rechargeDay = new Date(weekStart);
  rechargeDay.setDate(weekStart.getDate() + 6);
  const fmt = (d) => d.toISOString().split("T")[0];
  return {
    weekNum,
    dayInCycle,
    isRechargeDay: dayInCycle === 6,
    isBattleDay: dayInCycle < 6,
    battleDayNum: dayInCycle + 1,
    weekStart: fmt(weekStart),
    weekEnd: fmt(weekEnd),
    rechargeDate: fmt(rechargeDay),
    totalDaysIn: diffDays + 1,
  };
};

const DAILY_QUESTS = [
  { id:"workout",  label:"Complete Today's Workout",  xp:50,  icon:"⚔️" },
  { id:"stepper",  label:"Hit Stepper Target",        xp:30,  icon:"🏃" },
  { id:"meals",    label:"Log All Meals",              xp:20,  icon:"🍽️" },
  { id:"journal",  label:"Write Journal Entry",        xp:15,  icon:"📜" },
  { id:"habits",   label:"Complete All Habits",        xp:25,  icon:"🛡️" },
  { id:"nojunk",   label:"No Junk Food Today",         xp:35,  icon:"🚫" },
  { id:"weight",   label:"Log Today's Weight",         xp:10,  icon:"⚖️" },
];

const BOSSES = [
  { id:"craving",  name:"The Craving Demon",   appearsAt:91, hp:3, icon:"👹", weakness:"Log clean meals for 3 days straight", attack:"Drains Vitality", reward:500, badge:"Temptation Slayer 🏅", stat:"vitality" },
  { id:"sloth",    name:"The Sloth Lord",       appearsAt:85, hp:5, icon:"🦥", weakness:"Complete 5 workouts in 7 days",       attack:"Drains Agility",   reward:600, badge:"Iron Will 🛡️",        stat:"agility"  },
  { id:"plateau",  name:"The Plateau Witch",    appearsAt:79, hp:5, icon:"🧙", weakness:"Hit step target 5 days straight",     attack:"Freezes XP gain",  reward:700, badge:"Unstoppable 👟",      stat:"strength" },
  { id:"mirror",   name:"The Mirror Demon",     appearsAt:67, hp:7, icon:"🪞", weakness:"Journal + habits for 7 days",         attack:"Drains Willpower", reward:800, badge:"Mind Unbroken 🧠",    stat:"willpower"},
  { id:"shadow",   name:"THE SHADOW SELF",      appearsAt:55, hp:10,icon:"🌑", weakness:"All daily quests for 10 days",        attack:"Drains 50 XP",     reward:2000,badge:"UNLEASHED 👑",       stat:"fire"     },
];

const INVENTORY_ITEMS = {
  weapons: [
    { id:"w1", name:"Iron Dagger",    icon:"🗡️",  req:"First workout",       stat:"+5 Strength"  },
    { id:"w2", name:"Steel Sword",    icon:"⚔️",  req:"7 workouts complete", stat:"+15 Strength" },
    { id:"w3", name:"Warrior Blade",  icon:"🔥",  req:"30 workouts",         stat:"+30 Strength" },
  ],
  armor: [
    { id:"a1", name:"Cloth Armor",    icon:"👕",  req:"3-day streak",        stat:"+5 Vitality"  },
    { id:"a2", name:"Chain Mail",     icon:"🛡️",  req:"7-day streak",        stat:"+15 Vitality" },
    { id:"a3", name:"Dragon Scale",   icon:"🐉",  req:"21-day streak",       stat:"+40 Vitality" },
  ],
  rings: [
    { id:"r1", name:"Ring of Will",   icon:"💍",  req:"Knee push-ups mastered", stat:"+10 Willpower"},
    { id:"r2", name:"Ring of Speed",  icon:"⚡",  req:"2K stepper week",        stat:"+10 Agility"  },
    { id:"r3", name:"Ring of Fire",   icon:"🔮",  req:"14-day streak",           stat:"+20 Fire"     },
  ],
  potions: [
    { id:"p1", name:"Shield Potion",  icon:"🧪",  req:"Earned monthly",      effect:"Prevents 1 streak break" },
  ],
};

const ACHIEVEMENTS = [
  { id:"first_blood",  name:"First Blood",       icon:"🩸", condition:"First workout logged"        },
  { id:"iron_will",    name:"Iron Will",          icon:"🛡️", condition:"7-day streak"                },
  { id:"step_queen",   name:"Step Queen",         icon:"👟", condition:"10K stepper steps in a week" },
  { id:"warrior",      name:"The Warrior",        icon:"⚔️", condition:"10 kg lost"                  },
  { id:"comeback",     name:"The Comeback",       icon:"🔥", condition:"Resumed after 3-day break"   },
  { id:"mind_over",    name:"Mind Over Matter",   icon:"🧠", condition:"30 journal entries"          },
  { id:"half_way",     name:"Halfway There",      icon:"🌟", condition:"23 kg lost"                  },
  { id:"unleashed",    name:"UNLEASHED",          icon:"👑", condition:"Reached 48 kg"               },
];

const MILESTONES = [
  { id:1,  weight:91, emoji:"🔥", msg:"First 3 kg — the hardest barrier is your own doubt" },
  { id:2,  weight:88, emoji:"⚡", msg:"6 kg gone — people are starting to notice"          },
  { id:3,  weight:85, emoji:"🌟", msg:"9 kg down — you are undeniably changing"            },
  { id:4,  weight:82, emoji:"💥", msg:"12 kg lost — double digits territory"               },
  { id:5,  weight:79, emoji:"🏆", msg:"15 kg lost — completely different body"             },
  { id:6,  weight:76, emoji:"🎯", msg:"18 kg down — into the 70s"                         },
  { id:7,  weight:73, emoji:"✨", msg:"21 kg gone — the halfway mark to 50"               },
  { id:8,  weight:70, emoji:"👑", msg:"24 kg lost — entering the 60s next"                },
  { id:9,  weight:67, emoji:"🌙", msg:"27 kg down — deep into transformation"             },
  { id:10, weight:64, emoji:"⚔️", msg:"30 kg lost — an absolute warrior"                  },
  { id:11, weight:61, emoji:"🎨", msg:"33 kg — the final chapter begins"                  },
  { id:12, weight:58, emoji:"🪄", msg:"36 kg lost — you can see the finish line"          },
  { id:13, weight:55, emoji:"🏁", msg:"39 kg — one milestone from 50"                     },
  { id:14, weight:50, emoji:"🌸", msg:"44 kg lost — the dream is real"                    },
  { id:15, weight:48, emoji:"👑", msg:"The impossible level — 46 kg total"                },
];

const ACTIVITIES = ["Work","Eating","Rest","Screen Time","Exercise","Personal","Other"];
const ACT_COLORS = ["#f59e0b","#10b981","#6366f1","#ef4444","#3b82f6","#ec4899","#8b5cf6"];
const MEALS_LIST = ["Breakfast","Lunch","Dinner","Snack"];
const HERBAL = [
  {name:"F1 Shake 🥤",           cal:220},
  {name:"Protein Powder 💪",     cal:110},
  {name:"Active Fiber 🌾",       cal:30},
  {name:"Afresh Energy ⚡",      cal:10},
  {name:"Cell-U-Loss 💊",        cal:5},
];
const MEAL_PLAN = [
  { time:"7-8 AM",      meal:"Afresh energy drink (empty stomach)"           },
  { time:"8-9 AM",      meal:"F1 Shake + Protein Powder + Active Fiber"      },
  { time:"12-1 PM",     meal:"Fiber → Dal + sabzi + 1 roti OR small rice"    },
  { time:"4-5 PM",      meal:"Apple / pear OR sprouts chaat"                  },
  { time:"7-8 PM",      meal:"F1 Shake OR khichdi / soup / curd"             },
  { time:"After 8 PM",  meal:"⛔ NOTHING. Water only. Non-negotiable."        },
];
const DEFAULT_HABITS = ["Drink 8 glasses water 💧","Take Herbalife shake 🥤","10 min walk 🚶","No junk food 🚫","Sleep by 11pm 🌙"];
const WEEK_SCHEDULE = {
  0:{ type:"rest",     label:"Rest Day 🛌",        color:"#6366f1" },
  1:{ type:"upper",    label:"Upper Body 💪",       color:"#f59e0b" },
  2:{ type:"recovery", label:"Active Recovery 🧘",  color:"#10b981" },
  3:{ type:"lower",    label:"Lower Body 🦵",       color:"#3b82f6" },
  4:{ type:"recovery", label:"Active Recovery 🧘",  color:"#10b981" },
  5:{ type:"full",     label:"Full Body 🔥",        color:"#ef4444" },
  6:{ type:"stepper",  label:"Stepper + Skill 🏃",  color:"#ec4899" },
};
const PHASE_EXERCISES = {
  1:{ upper:[{name:"Bicep Curls",equip:"2kg 💪",sets:2,reps:8},{name:"Shoulder Press",equip:"2kg 💪",sets:2,reps:8},{name:"Lateral Raises",equip:"2kg 💪",sets:2,reps:8},{name:"Tricep Kickbacks",equip:"2kg 💪",sets:2,reps:8}],lower:[{name:"Goblet Squat",equip:"2kg 💪",sets:2,reps:10},{name:"Reverse Lunges",equip:"2kg 💪",sets:2,reps:8},{name:"Glute Bridges",equip:"Bodyweight",sets:2,reps:12},{name:"Calf Raises",equip:"Bodyweight",sets:2,reps:15}],full:[{name:"Romanian Deadlift",equip:"2kg 💪",sets:2,reps:10},{name:"Bent Over Row",equip:"2kg 💪",sets:2,reps:10},{name:"Front Raises",equip:"2kg 💪",sets:2,reps:8},{name:"Bodyweight Squat",equip:"Bodyweight",sets:2,reps:10}],recovery:[{name:"Cat-Cow Stretch",equip:"Yoga 🧘",sets:1,reps:10},{name:"Child's Pose",equip:"Yoga 🧘",sets:2,reps:1,note:"hold 30s"},{name:"Seated Spinal Twist",equip:"Yoga 🧘",sets:1,reps:10},{name:"Neck Rolls",equip:"Yoga 🧘",sets:1,reps:1,note:"1 min"}] },
  2:{ upper:[{name:"Bicep Curls",equip:"5kg 💪",sets:3,reps:10},{name:"Shoulder Press",equip:"5kg 💪",sets:3,reps:10},{name:"Lateral Raises",equip:"2kg 💪",sets:3,reps:12},{name:"Tricep Overhead",equip:"5kg 💪",sets:3,reps:10},{name:"Front Raises",equip:"2kg 💪",sets:2,reps:12}],lower:[{name:"Goblet Squat",equip:"5kg 💪",sets:3,reps:12},{name:"Reverse Lunges",equip:"5kg 💪",sets:3,reps:10},{name:"Glute Bridges",equip:"5kg 💪",sets:3,reps:12},{name:"Sumo Squat",equip:"5kg 💪",sets:2,reps:12},{name:"Calf Raises",equip:"Bodyweight",sets:3,reps:20}],full:[{name:"Romanian Deadlift",equip:"5kg 💪",sets:3,reps:12},{name:"Bent Over Row",equip:"5kg 💪",sets:3,reps:12},{name:"Arnold Press",equip:"5kg 💪",sets:3,reps:10},{name:"Squat to Press",equip:"5kg 💪",sets:3,reps:10}],recovery:[{name:"Sun Salutation",equip:"Yoga 🧘",sets:3,reps:1,note:"3 rounds"},{name:"Warrior 1",equip:"Yoga 🧘",sets:2,reps:1,note:"hold 30s each"},{name:"Bridge Pose",equip:"Yoga 🧘",sets:1,reps:10},{name:"Downward Dog",equip:"Yoga 🧘",sets:2,reps:1,note:"hold 30s"}] },
  3:{ upper:[{name:"Bicep Curls",equip:"5kg 💪",sets:3,reps:12},{name:"Arnold Press",equip:"5kg 💪",sets:3,reps:12},{name:"Upright Rows",equip:"5kg 💪",sets:3,reps:12},{name:"Tricep Press",equip:"5kg 💪",sets:3,reps:12},{name:"Hammer Curls",equip:"5kg 💪",sets:3,reps:12}],lower:[{name:"Goblet Squat",equip:"5kg 💪",sets:3,reps:15},{name:"Walking Lunges",equip:"5kg 💪",sets:3,reps:12},{name:"Hip Thrust",equip:"5kg 💪",sets:3,reps:15},{name:"Single Leg Deadlift",equip:"5kg 💪",sets:3,reps:10},{name:"Sumo Squat",equip:"5kg 💪",sets:3,reps:15}],full:[{name:"Romanian Deadlift",equip:"5kg 💪",sets:4,reps:12},{name:"Renegade Row",equip:"5kg 💪",sets:3,reps:10},{name:"Squat to Press",equip:"5kg 💪",sets:3,reps:12},{name:"Reverse Lunges",equip:"5kg 💪",sets:3,reps:12}],recovery:[{name:"Sun Salutation",equip:"Yoga 🧘",sets:5,reps:1,note:"5 rounds"},{name:"Warrior 2",equip:"Yoga 🧘",sets:2,reps:1,note:"45s each side"},{name:"Chair Pose",equip:"Yoga 🧘",sets:3,reps:1,note:"hold 30s"},{name:"Plank Hold",equip:"Yoga 🧘",sets:2,reps:1,note:"20s hold"}] },
  4:{ upper:[{name:"Bicep Curls",equip:"5kg 💪",sets:4,reps:15},{name:"Arnold Press",equip:"5kg 💪",sets:4,reps:12},{name:"Upright Rows",equip:"5kg 💪",sets:4,reps:12},{name:"Tricep Press",equip:"5kg 💪",sets:4,reps:12},{name:"Hammer Curls",equip:"5kg 💪",sets:4,reps:12}],lower:[{name:"Goblet Squat",equip:"5kg 💪",sets:4,reps:15},{name:"Walking Lunges",equip:"5kg 💪",sets:4,reps:12},{name:"Hip Thrust",equip:"5kg 💪",sets:4,reps:15},{name:"Single Leg Deadlift",equip:"5kg 💪",sets:4,reps:12}],full:[{name:"Deadlift",equip:"5kg 💪",sets:4,reps:15},{name:"Renegade Row",equip:"5kg 💪",sets:4,reps:12},{name:"Squat to Press",equip:"5kg 💪",sets:4,reps:12},{name:"Reverse Lunges",equip:"5kg 💪",sets:4,reps:12}],recovery:[{name:"Power Yoga Flow",equip:"Yoga 🧘",sets:1,reps:1,note:"15 min"},{name:"Warrior Sequence",equip:"Yoga 🧘",sets:1,reps:1,note:"3 min"},{name:"Balance Poses",equip:"Yoga 🧘",sets:2,reps:1,note:"2 min each side"}] },
  5:{ upper:[{name:"Bicep Curls",equip:"5kg 💪",sets:5,reps:15},{name:"Arnold Press",equip:"5kg 💪",sets:5,reps:15},{name:"Upright Rows",equip:"5kg 💪",sets:4,reps:15},{name:"Hammer Curls",equip:"5kg 💪",sets:4,reps:15},{name:"Lateral Raises",equip:"5kg 💪",sets:4,reps:15}],lower:[{name:"Goblet Squat",equip:"5kg 💪",sets:5,reps:20},{name:"Walking Lunges",equip:"5kg 💪",sets:5,reps:15},{name:"Hip Thrust",equip:"5kg 💪",sets:5,reps:15},{name:"Lateral Lunges",equip:"5kg 💪",sets:4,reps:15},{name:"Calf Raises",equip:"5kg 💪",sets:4,reps:25}],full:[{name:"Romanian Deadlift",equip:"5kg 💪",sets:5,reps:15},{name:"Renegade Row",equip:"5kg 💪",sets:5,reps:12},{name:"Squat to Press",equip:"5kg 💪",sets:5,reps:15},{name:"Arnold Press",equip:"5kg 💪",sets:4,reps:15}],recovery:[{name:"Advanced Yoga Flow",equip:"Yoga 🧘",sets:1,reps:1,note:"20 min"},{name:"Warrior III",equip:"Yoga 🧘",sets:3,reps:1,note:"hold 30s each side"},{name:"Crow Pose Attempt",equip:"Yoga 🧘",sets:3,reps:1,note:"hold as long as you can"}] },
};
const SKILL_TREE = [
  { id:"pushup", name:"Push-up", icon:"🤸", levels:[{id:1,name:"Wall Push-ups",target:10,unit:"reps",tip:"Stand arm's length from wall"},{id:2,name:"Wall Push-ups",target:20,unit:"reps",tip:"20 clean wall push-ups"},{id:3,name:"Incline Push-ups",target:10,unit:"reps",tip:"Hands on chair edge"},{id:4,name:"Knee Push-ups",target:10,unit:"reps",tip:"Chest all the way down"},{id:5,name:"Knee Push-ups",target:20,unit:"reps",tip:"⭐ MILESTONE — 20 knee push-ups!"},{id:6,name:"Full Push-ups",target:3,unit:"reps",tip:"Your first 3 real push-ups 🔥"},{id:7,name:"Full Push-ups",target:10,unit:"reps",tip:"10 consecutive push-ups"},{id:8,name:"Full Push-ups",target:20,unit:"reps",tip:"🎖️ MASTERED — 20 full push-ups!"}] },
  { id:"plank",  name:"Plank",   icon:"🧱", levels:[{id:1,name:"Knee Plank",target:15,unit:"secs",tip:"Knees down, hips level"},{id:2,name:"Knee Plank",target:30,unit:"secs",tip:"30 second knee plank"},{id:3,name:"Full Plank",target:15,unit:"secs",tip:"Body straight as a board"},{id:4,name:"Full Plank",target:30,unit:"secs",tip:"30 second plank"},{id:5,name:"Full Plank",target:60,unit:"secs",tip:"⭐ MILESTONE — 1 full minute!"},{id:6,name:"Full Plank",target:90,unit:"secs",tip:"90 seconds beast mode"},{id:7,name:"Full Plank",target:120,unit:"secs",tip:"🎖️ MASTERED — 2 minutes!"}] },
  { id:"squat",  name:"Squat",   icon:"🦵", levels:[{id:1,name:"Supported Squat",target:10,unit:"reps",tip:"Hold chair for support"},{id:2,name:"Half Squat",target:15,unit:"reps",tip:"Halfway down, no support"},{id:3,name:"Full Squat",target:10,unit:"reps",tip:"Full depth, arms forward"},{id:4,name:"Full Squat",target:20,unit:"reps",tip:"20 clean deep squats"},{id:5,name:"Full Squat",target:50,unit:"reps",tip:"⭐ MILESTONE — 50 squats!"},{id:6,name:"Jump Squat",target:10,unit:"reps",tip:"Add explosive jump"},{id:7,name:"Jump Squat",target:20,unit:"reps",tip:"🎖️ MASTERED — 20 jump squats!"}] },
  { id:"dips",   name:"Dips",    icon:"💺", levels:[{id:1,name:"Assisted Dips",target:5,unit:"reps",tip:"Use legs to help"},{id:2,name:"Assisted Dips",target:10,unit:"reps",tip:"Use legs less gradually"},{id:3,name:"Full Chair Dips",target:8,unit:"reps",tip:"Legs extended, full dip"},{id:4,name:"Full Chair Dips",target:15,unit:"reps",tip:"⭐ MILESTONE — 15 dips!"},{id:5,name:"Full Chair Dips",target:20,unit:"reps",tip:"🎖️ MASTERED — 20 dips!"}] },
  { id:"burpee", name:"Burpee",  icon:"⚡", levels:[{id:1,name:"Step-out Burpee",target:3,unit:"reps",tip:"Step back and forward"},{id:2,name:"Step-out Burpee",target:8,unit:"reps",tip:"8 controlled step burpees"},{id:3,name:"Half Burpee",target:5,unit:"reps",tip:"Jump back, no push-up"},{id:4,name:"Half Burpee",target:10,unit:"reps",tip:"⭐ MILESTONE — 10 half burpees!"},{id:5,name:"Full Burpee",target:5,unit:"reps",tip:"Complete with jump"},{id:6,name:"Full Burpee",target:10,unit:"reps",tip:"10 full burpees"},{id:7,name:"Full Burpee",target:20,unit:"reps",tip:"🎖️ MASTERED — 20 burpees!"}] },
];
const STEP_WEEKLY_TARGETS = [2000,3500,5000,7000,10000,12000,14000];


// ═══════════════════════════════════════════
// INDIAN VEGETARIAN FOOD DATABASE (calories per standard serving)
// Source: ICMR-NIN Nutritive Value of Indian Foods + NutritionValue.org
// ═══════════════════════════════════════════
const FOOD_DB = [
  // Breads & Grains
  {name:"Roti / Chapati (1 medium)",cal:70,cat:"🌾 Breads"},
  {name:"Paratha plain (1 medium)",cal:150,cat:"🌾 Breads"},
  {name:"Paratha stuffed aloo (1)",cal:210,cat:"🌾 Breads"},
  {name:"Puri (1 medium)",cal:110,cat:"🌾 Breads"},
  {name:"Naan plain (1 piece)",cal:262,cat:"🌾 Breads"},
  {name:"Bhatura (1 medium)",cal:200,cat:"🌾 Breads"},
  {name:"Bread white (1 slice)",cal:70,cat:"🌾 Breads"},
  {name:"Bread brown (1 slice)",cal:65,cat:"🌾 Breads"},
  // Rice
  {name:"Rice cooked (1 cup / 200g)",cal:260,cat:"🍚 Rice"},
  {name:"Jeera rice (1 cup)",cal:300,cat:"🍚 Rice"},
  {name:"Biryani veg (1 cup)",cal:350,cat:"🍚 Rice"},
  {name:"Khichdi (1 cup)",cal:220,cat:"🍚 Rice"},
  {name:"Poha (1 cup)",cal:270,cat:"🍚 Rice"},
  {name:"Upma (1 cup)",cal:250,cat:"🍚 Rice"},
  {name:"Idli (1 piece)",cal:39,cat:"🍚 Rice"},
  {name:"Dosa plain (1 medium)",cal:120,cat:"🍚 Rice"},
  {name:"Dosa masala (1 medium)",cal:210,cat:"🍚 Rice"},
  {name:"Uttapam (1 medium)",cal:180,cat:"🍚 Rice"},
  // Dal & Legumes
  {name:"Dal tadka (1 cup)",cal:150,cat:"🫘 Dal"},
  {name:"Dal makhani (1 cup)",cal:220,cat:"🫘 Dal"},
  {name:"Chana masala (1 cup)",cal:270,cat:"🫘 Dal"},
  {name:"Rajma (1 cup)",cal:230,cat:"🫘 Dal"},
  {name:"Moong dal (1 cup)",cal:140,cat:"🫘 Dal"},
  {name:"Masoor dal (1 cup)",cal:150,cat:"🫘 Dal"},
  {name:"Sambar (1 cup)",cal:90,cat:"🫘 Dal"},
  {name:"Chole (1 cup)",cal:270,cat:"🫘 Dal"},
  {name:"Sprouts boiled (1 cup)",cal:80,cat:"🫘 Dal"},
  {name:"Peas curry (1 cup)",cal:160,cat:"🫘 Dal"},
  // Vegetables
  {name:"Sabzi / veg curry (1 cup)",cal:100,cat:"🥦 Vegetables"},
  {name:"Aloo sabzi (1 cup)",cal:180,cat:"🥦 Vegetables"},
  {name:"Palak paneer (1 cup)",cal:260,cat:"🥦 Vegetables"},
  {name:"Matar paneer (1 cup)",cal:280,cat:"🥦 Vegetables"},
  {name:"Baingan bharta (1 cup)",cal:120,cat:"🥦 Vegetables"},
  {name:"Bhindi masala (1 cup)",cal:110,cat:"🥦 Vegetables"},
  {name:"Gobi sabzi (1 cup)",cal:130,cat:"🥦 Vegetables"},
  {name:"Mixed veg curry (1 cup)",cal:120,cat:"🥦 Vegetables"},
  {name:"Saag (1 cup)",cal:100,cat:"🥦 Vegetables"},
  {name:"Kadhi (1 cup)",cal:140,cat:"🥦 Vegetables"},
  // Snacks
  {name:"Samosa (1 piece)",cal:135,cat:"🧆 Snacks"},
  {name:"Kachori (1 piece)",cal:200,cat:"🧆 Snacks"},
  {name:"Pakora / Bhajiya (4-5 pcs)",cal:170,cat:"🧆 Snacks"},
  {name:"Dhokla (2 pieces)",cal:80,cat:"🧆 Snacks"},
  {name:"Idli (2 pieces)",cal:78,cat:"🧆 Snacks"},
  {name:"Vada pav (1)",cal:290,cat:"🧆 Snacks"},
  {name:"Pani puri (6 pieces)",cal:150,cat:"🧆 Snacks"},
  {name:"Bhel puri (1 cup)",cal:180,cat:"🧆 Snacks"},
  {name:"Popcorn plain (1 cup)",cal:55,cat:"🧆 Snacks"},
  {name:"Roasted chana (handful)",cal:120,cat:"🧆 Snacks"},
  {name:"Sprouts chaat (1 bowl)",cal:100,cat:"🧆 Snacks"},
  {name:"Murmura / Puffed rice (1 cup)",cal:60,cat:"🧆 Snacks"},
  // Dairy
  {name:"Milk full fat (1 glass/250ml)",cal:150,cat:"🥛 Dairy"},
  {name:"Milk toned (1 glass/250ml)",cal:120,cat:"🥛 Dairy"},
  {name:"Curd / Dahi (1 cup)",cal:100,cat:"🥛 Dairy"},
  {name:"Paneer (100g)",cal:265,cat:"🥛 Dairy"},
  {name:"Paneer low fat (100g)",cal:200,cat:"🥛 Dairy"},
  {name:"Buttermilk / Chaas (1 glass)",cal:40,cat:"🥛 Dairy"},
  {name:"Lassi sweet (1 glass)",cal:180,cat:"🥛 Dairy"},
  {name:"Lassi salted (1 glass)",cal:100,cat:"🥛 Dairy"},
  {name:"Cheese slice (1 piece)",cal:70,cat:"🥛 Dairy"},
  {name:"Ghee (1 tsp)",cal:45,cat:"🥛 Dairy"},
  {name:"Butter (1 tsp)",cal:36,cat:"🥛 Dairy"},
  // Fruits
  {name:"Apple (1 medium)",cal:80,cat:"🍎 Fruits"},
  {name:"Banana (1 medium)",cal:90,cat:"🍎 Fruits"},
  {name:"Orange (1 medium)",cal:60,cat:"🍎 Fruits"},
  {name:"Mango (1 cup sliced)",cal:100,cat:"🍎 Fruits"},
  {name:"Papaya (1 cup)",cal:55,cat:"🍎 Fruits"},
  {name:"Guava (1 medium)",cal:70,cat:"🍎 Fruits"},
  {name:"Watermelon (1 cup)",cal:46,cat:"🍎 Fruits"},
  {name:"Grapes (1 cup)",cal:90,cat:"🍎 Fruits"},
  {name:"Pomegranate (1 cup seeds)",cal:83,cat:"🍎 Fruits"},
  {name:"Pear (1 medium)",cal:90,cat:"🍎 Fruits"},
  // Drinks
  {name:"Chai with milk & sugar (1 cup)",cal:60,cat:"☕ Drinks"},
  {name:"Chai without sugar (1 cup)",cal:30,cat:"☕ Drinks"},
  {name:"Coffee with milk (1 cup)",cal:50,cat:"☕ Drinks"},
  {name:"Coconut water (1 glass)",cal:45,cat:"☕ Drinks"},
  {name:"Fresh lime water sugar (1 glass)",cal:60,cat:"☕ Drinks"},
  {name:"Fresh lime water plain (1 glass)",cal:10,cat:"☕ Drinks"},
  {name:"Herbalife F1 shake (1 serving)",cal:220,cat:"☕ Drinks"},
  // Sweets
  {name:"Ladoo besan (1 piece)",cal:180,cat:"🍬 Sweets"},
  {name:"Halwa (1 cup)",cal:350,cat:"🍬 Sweets"},
  {name:"Kheer (1 cup)",cal:200,cat:"🍬 Sweets"},
  {name:"Gulab jamun (1 piece)",cal:150,cat:"🍬 Sweets"},
  {name:"Rasgulla (1 piece)",cal:100,cat:"🍬 Sweets"},
  {name:"Ice cream (1 scoop)",cal:130,cat:"🍬 Sweets"},
  {name:"Chocolate (1 square/10g)",cal:55,cat:"🍬 Sweets"},
];


// ═══════════════════════════════════════════
// INTERMITTENT FASTING LEVELS
// ═══════════════════════════════════════════
// Global style helpers (used by components outside App)
const card = { background: "#181818", border:"1px solid #2e2e2e", borderRadius:14, padding:16, marginBottom:12 };
const inp = { background:"#111111", border:"1px solid #3a3a3a", borderRadius:9, padding:"10px 13px", color:"#f0f0f0", fontSize:13, width:"100%", boxSizing:"border-box", outline:"none" };
const btn = (v="primary") => ({ background: v==="primary"?"#f59e0b":v==="danger"?"#ef4444":v==="success"?"#10b981":v==="purple"?"#6d28d9":"#2a2a2a", color:v==="primary"?"#000":"#fff", border:v==="ghost"?"1px solid #3a3a3a":"none", borderRadius:9, padding:"10px 16px", cursor:"pointer", fontWeight:600, fontSize:13 });


const IF_LEVELS = [
  { id:1, name:"Beginner",    window:"8AM – 8PM",  start:"08:00", end:"20:00", hours:12, meals:["Breakfast","Lunch","Dinner","Snack"],  color:"#10b981", desc:"12 hour eating window — gentle start" },
  { id:2, name:"Warrior",     window:"9AM – 7PM",  start:"09:00", end:"19:00", hours:10, meals:["Breakfast","Lunch","Dinner","Snack"],  color:"#f59e0b", desc:"10 hour window — building discipline" },
  { id:3, name:"Battle Mode", window:"11AM – 7PM", start:"11:00", end:"19:00", hours:8,  meals:["Lunch","Dinner","Snack"],             color:"#ef4444", desc:"8 hour window — serious warrior" },
  { id:4, name:"Elite",       window:"12PM – 6PM", start:"12:00", end:"18:00", hours:6,  meals:["Lunch","Dinner"],                     color:"#7c3aed", desc:"6 hour window — elite level" },
];



const fmtTime = (h24, m) => {
  const period = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 > 12 ? h24 - 12 : h24 === 0 ? 12 : h24;
  return `${h12}:${String(m||0).padStart(2,"0")} ${period}`;
};
const calcEndTime = (startTime, hours) => {
  if(!startTime) return "";
  const [h, m] = startTime.split(":").map(Number);
  return fmtTime((h + hours) % 24, m);
};
const formatStartTime = (t) => {
  if(!t) return "";
  const [h, m] = t.split(":").map(Number);
  return fmtTime(h, m);
};




const FastDayLog = ({ entries, onAdd, onRemove, onEdit, customFoods, onAddCustom, ifWindow }) => {
  const [input, setInput] = useState("");
  const [manualCal, setManualCal] = useState("");
  const [matchFound, setMatchFound] = useState(null);
  const [showManual, setShowManual] = useState(false);
  const [editingIdx, setEditingIdx] = useState(null);
  const [editCal, setEditCal] = useState("");

  const allFoods = [...FOOD_DB, ...Object.values(customFoods)];
  const totalCal = entries.reduce((s, e) => s + (e.cal || 0), 0);

  const handleSearch = (val) => {
    setInput(val);
    setShowManual(false);
    setManualCal("");
    if (val.length > 1) {
      const found = allFoods.find(f => f.name.toLowerCase().includes(val.toLowerCase()));
      setMatchFound(found || null);
    } else {
      setMatchFound(null);
    }
  };

  const addItem = (food) => {
    onAdd({ name: food.name, cal: food.cal });
    setInput(""); setMatchFound(null); setShowManual(false); setManualCal("");
  };

  const addManual = () => {
    if (!input.trim() || !manualCal) return;
    const food = { name: input.trim(), cal: parseInt(manualCal) || 0, cat: "⭐ My Foods" };
    onAddCustom(food);
    onAdd(food);
    setInput(""); setManualCal(""); setShowManual(false); setMatchFound(null);
  };

  return (
    <div style={{ ...card, border: "1px solid #818cf844", background: "#0a0a1a" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#818cf8" }}>⚡ Fast Day Log</div>
        {totalCal > 0 && <div style={{ fontSize: 12, color: C.gold, fontWeight: 700 }}>{totalCal} kcal</div>}
      </div>
      {ifWindow && <div style={{ fontSize: 10, color: "#818cf8", marginBottom: 10 }}>Reference window: {ifWindow}</div>}
      <div style={{ fontSize: 11, color: C.muted, marginBottom: 10 }}>Type anything you consumed — system will auto-find calories</div>

      <input style={{ ...inp, marginBottom: 8 }} placeholder="e.g. coconut water, apple, lemon water..." value={input} onChange={e => handleSearch(e.target.value)} />

      {/* Auto match found */}
      {matchFound && !showManual && (
        <div style={{ background: "#0a1a00", borderRadius: 8, padding: 12, marginBottom: 8, border: `1px solid ${C.green}44` }}>
          <div style={{ fontSize: 11, color: C.green, marginBottom: 6 }}>✓ Found in database:</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{matchFound.name}</div>
              <div style={{ fontSize: 11, color: C.gold }}>{matchFound.cal} kcal</div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button style={{ ...btn("success"), fontSize: 11, padding: "6px 12px" }} onClick={() => addItem(matchFound)}>Add ✓</button>
              <button style={{ ...btn("ghost"), fontSize: 11, padding: "6px 12px" }} onClick={() => setShowManual(true)}>Different cal</button>
            </div>
          </div>
        </div>
      )}

      {/* Not found — manual entry */}
      {input.length > 1 && !matchFound && !showManual && (
        <div style={{ background: "#111", borderRadius: 8, padding: 12, marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>Not in database — enter calories manually</div>
          <input style={{ ...inp, marginBottom: 8 }} type="number" placeholder="Calories (kcal)" value={manualCal} onChange={e => setManualCal(e.target.value)} />
          <button style={{ ...btn(), width: "100%", fontSize: 12 }} onClick={addManual}>Add with manual calories ✓</button>
        </div>
      )}

      {/* Override calories */}
      {showManual && (
        <div style={{ background: "#111", borderRadius: 8, padding: 12, marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>Enter your own calories for: <span style={{ color: C.text }}>{matchFound?.name}</span></div>
          <input style={{ ...inp, marginBottom: 8 }} type="number" placeholder="Your calorie amount" value={manualCal} onChange={e => setManualCal(e.target.value)} />
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{ ...btn(), flex: 1, fontSize: 12 }} onClick={() => { if(!input.trim()||!manualCal) return; onAdd({name:input.trim(),cal:parseInt(manualCal)||0}); setInput("");setManualCal("");setShowManual(false);setMatchFound(null); }}>Add ✓</button>
            <button style={{ ...btn("ghost"), fontSize: 12 }} onClick={() => setShowManual(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Log entries */}
      {entries.length > 0 && (
        <div style={{ background: "#111", borderRadius: 8, overflow: "hidden", marginTop: 8 }}>
          {entries.map((e, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderBottom: i < entries.length - 1 ? `1px solid #1a1a1a` : "none" }}>
              <span style={{ flex: 1, fontSize: 12 }}>{e.name}</span>
              {editingIdx === i ? (
                <div style={{ display: "flex", gap: 4 }}>
                  <input style={{ ...inp, width: 60, fontSize: 11, padding: "4px 6px" }} type="number" value={editCal} onChange={ev => setEditCal(ev.target.value)} autoFocus />
                  <button style={{ ...btn("success"), fontSize: 10, padding: "4px 8px" }} onClick={() => { onEdit(i, parseInt(editCal) || e.cal); setEditingIdx(null); }}>✓</button>
                </div>
              ) : (
                <span style={{ fontSize: 12, color: C.gold, fontWeight: 700, cursor: "pointer" }} onClick={() => { setEditingIdx(i); setEditCal(String(e.cal)); }}>{e.cal} ✏️</span>
              )}
              <button style={{ background: "none", border: "none", color: C.red, cursor: "pointer", fontSize: 14 }} onClick={() => onRemove(i)}>×</button>
            </div>
          ))}
          <div style={{ textAlign: "right", padding: "6px 12px", fontSize: 12, color: C.gold, fontWeight: 700, borderTop: `1px solid #1a1a1a` }}>Fast day total: {totalCal} kcal</div>
        </div>
      )}

      {entries.length === 0 && (
        <div style={{ textAlign: "center", padding: "20px 0", color: C.muted, fontSize: 12 }}>Nothing logged yet — type above to add</div>
      )}
    </div>
  );
};


const WeekDateTabs = ({ battleStartDate }) => {
  const todayStr = new Date().toISOString().split("T")[0];

  // Calculate current battle week days from battle start date
  const getBattleWeekDays = () => {
    if(!battleStartDate) return [];
    const start = new Date(battleStartDate);
    const today = new Date(todayStr);
    const diffDays = Math.floor((today - start) / 86400000);
    if(diffDays < 0) return [];
    const weekNum = Math.floor(diffDays / 7);
    const weekStart = new Date(start);
    weekStart.setDate(start.getDate() + weekNum * 7);
    const days = [];
    for(let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      days.push(d);
    }
    return days;
  };

  const weekDays = getBattleWeekDays();
  const dayLabels = ["Day 1","Day 2","Day 3","Day 4","Day 5","Day 6","⚡ Rest"];

  if(!battleStartDate) return (
    <div style={{ fontSize: 11, color: C.muted, padding: "8px 0", fontStyle: "italic" }}>
      Set your Battle Start Date in the Realm tab to see your week here.
    </div>
  );

  return (
    <div>
      <div style={{ fontSize: 9, color: C.muted, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>📅 Battle Week</div>
      <div style={{ display: "flex", gap: 5, overflowX: "auto", paddingBottom: 4 }}>
        {weekDays.map((day, i) => {
          const ds = day.toISOString().split("T")[0];
          const isToday = ds === todayStr;
          const isPast = ds < todayStr;
          const isRecharge = i === 6;
          const dayNum = day.getDate();
          const month = day.toLocaleString("default", { month: "short" });

          return (
            <div key={i} style={{
              flexShrink: 0,
              minWidth: 46,
              borderRadius: 10,
              padding: "8px 5px",
              textAlign: "center",
              border: `2px solid ${isToday ? C.gold : isRecharge ? "#818cf8" : isPast ? C.green : "#2a2a2a"}`,
              background: isToday ? "#1c1000" : isRecharge ? "#0a0a1a" : isPast ? "#052e16" : "#0f0f0f",
              transition: "all 0.2s",
            }}>
              <div style={{ fontSize: 8, color: isToday ? C.gold : isRecharge ? "#818cf8" : isPast ? C.green : C.muted, fontWeight: 700, marginBottom: 3 }}>
                {dayLabels[i]}
              </div>
              <div style={{ fontSize: 15, fontWeight: 900, color: isToday ? C.gold : isRecharge ? "#818cf8" : isPast ? C.green : "#444" }}>
                {dayNum}
              </div>
              <div style={{ fontSize: 8, color: isToday ? C.gold : isRecharge ? "#818cf8" : isPast ? "#6ee7b7" : "#333", marginTop: 2 }}>
                {month}
              </div>
              {isPast && !isRecharge && <div style={{ fontSize: 9, color: C.green, marginTop: 2 }}>✓</div>}
              {isToday && <div style={{ fontSize: 7, color: C.gold, fontWeight: 800, marginTop: 2, letterSpacing: 0.5 }}>TODAY</div>}
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 8, fontSize: 9, color: C.muted }}>
        <span style={{ color: C.gold }}>■ Today</span>
        <span style={{ color: C.green }}>■ Done</span>
        <span style={{ color: "#818cf8" }}>■ Recharge</span>
        <span style={{ color: "#444" }}>■ Upcoming</span>
      </div>
    </div>
  );
};


const IFLevelSelector = ({ onSelect }) => {
  const [pickedLevel, setPickedLevel] = useState(null);
  const [startTime, setStartTime] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const lv = IF_LEVELS.find(l => l.id === pickedLevel);

  const handleConfirm = () => {
    if(startTime && pickedLevel) {
      setConfirmed(true);
    }
  };

  // Week date calculation
  const getWeekDates = () => {
    const today = new Date();
    const day = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((day + 6) % 7));
    const saturday = new Date(monday);
    saturday.setDate(monday.getDate() + 5);
    const recharge = new Date(monday);
    recharge.setDate(monday.getDate() + 6);
    const fmt = (d) => d.toLocaleDateString("en-IN", { day:"numeric", month:"short" });
    return { start: fmt(monday), end: fmt(saturday), recharge: fmt(recharge) };
  };
  const weekDates = getWeekDates();

  // Once confirmed — show locked state, cannot change
  if(confirmed && lv) return (
    <div style={{ background: lv.color+"11", borderRadius: 10, padding: 14, border: `1px solid ${lv.color}` }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
        <div style={{ fontSize:13, fontWeight:700, color:lv.color }}>Level {lv.id} — {lv.name}</div>
        <div style={{ fontSize:10, color:C.red, background:"#1a0000", padding:"3px 8px", borderRadius:12, border:`1px solid ${C.red}44` }}>🔒 LOCKED</div>
      </div>

      {/* Week dates */}
      <div style={{ background:"#0a0a0a", borderRadius:8, padding:10, marginBottom:12, border:`1px solid #2a2a2a` }}>
        <div style={{ fontSize:9, color:C.muted, letterSpacing:2, textTransform:"uppercase", marginBottom:8 }}>📅 Battle Week</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:9, color:C.muted, marginBottom:3 }}>Week Starts</div>
            <div style={{ fontSize:13, fontWeight:800, color:lv.color }}>{weekDates.start}</div>
          </div>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:9, color:C.muted, marginBottom:3 }}>Week Ends</div>
            <div style={{ fontSize:13, fontWeight:800, color:lv.color }}>{weekDates.end}</div>
          </div>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:9, color:"#818cf8", marginBottom:3 }}>Recharge Day</div>
            <div style={{ fontSize:13, fontWeight:800, color:"#818cf8" }}>{weekDates.recharge}</div>
          </div>
        </div>
      </div>

      {/* Daily eating window */}
      <div style={{ display:"flex", gap:8, marginBottom:12 }}>
        <div style={{ flex:1, background:"#0a0a0a", borderRadius:8, padding:12, textAlign:"center" }}>
          <div style={{ fontSize:9, color:C.muted, marginBottom:4 }}>EATING FROM</div>
          <div style={{ fontSize:18, fontWeight:800, color:lv.color }}>{formatStartTime(startTime)}</div>
        </div>
        <div style={{ display:"flex", alignItems:"center", fontSize:20, color:C.muted }}>→</div>
        <div style={{ flex:1, background:"#0a0a0a", borderRadius:8, padding:12, textAlign:"center" }}>
          <div style={{ fontSize:9, color:C.muted, marginBottom:4 }}>EATING UNTIL</div>
          <div style={{ fontSize:18, fontWeight:800, color:lv.color }}>{calcEndTime(startTime, lv.hours)}</div>
        </div>
      </div>

      <div style={{ textAlign:"center", fontSize:11, color:C.muted, marginBottom:12 }}>{lv.hours} hour window daily · {lv.desc}</div>
      <button style={{ ...btn(), width:"100%", fontSize:13, padding:"12px" }}
        onClick={() => onSelect(pickedLevel, startTime)}>
        ⚔️ Begin This Week's Battle
      </button>
    </div>
  );

  return (
    <div>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>
        Choose your level → enter start time → end time auto-calculates → lock for the week.
      </div>

      {/* Level cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
        {IF_LEVELS.map(l => (
          <button key={l.id}
            style={{ padding: "12px 14px", borderRadius: 10, border: `2px solid ${pickedLevel === l.id ? l.color : l.color+"33"}`, background: pickedLevel === l.id ? l.color+"22" : "#111", cursor: "pointer", textAlign: "left", transition: "all 0.2s" }}
            onClick={() => { setPickedLevel(l.id); setStartTime(""); setConfirmed(false); }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: l.color }}>Level {l.id} — {l.name}</div>
                <div style={{ fontSize: 10, color: C.muted, marginTop: 2, fontStyle: "italic" }}>{l.desc}</div>
              </div>
              <div style={{ fontSize: 20, fontWeight: 900, color: l.color }}>{l.hours}h</div>
            </div>
          </button>
        ))}
      </div>

      {/* Time entry — only shows after level picked */}
      {pickedLevel && !confirmed && (
        <div style={{ background: "#111", borderRadius: 10, padding: 14, border: `1px solid ${lv?.color}44` }}>
          <div style={{ fontSize: 12, color: lv?.color, fontWeight: 700, marginBottom: 12 }}>
            Level {pickedLevel} — {lv?.name} · {lv?.hours}hr window
          </div>

          <div style={{ fontSize: 11, color: C.muted, marginBottom: 10 }}>When does your eating start today?</div>

          <div style={{ display: "flex", gap: 10, alignItems: "flex-end", marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: C.muted, marginBottom: 6 }}>Start time</div>
              <input
                style={{ ...inp, fontSize: 14, fontWeight: 700, color: lv?.color }}
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
              />
              {startTime && <div style={{ fontSize: 11, color: lv?.color, marginTop: 4, fontWeight: 700 }}>{formatStartTime(startTime)}</div>}
            </div>
            <div style={{ fontSize: 24, color: C.muted, paddingBottom: 12 }}>→</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: C.muted, marginBottom: 6 }}>End time (auto)</div>
              <div style={{ ...inp, fontSize: 14, fontWeight: 700, color: lv?.color, background: "#0a0a0a", border: `1px solid ${lv?.color}44` }}>
                {startTime ? calcEndTime(startTime, lv?.hours) : "—"}
              </div>
            </div>
          </div>

          {startTime && (
            <div style={{ background: lv?.color+"22", borderRadius: 8, padding: "10px 14px", marginBottom: 12, textAlign: "center", border: `1px solid ${lv?.color}44` }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: lv?.color }}>
                {formatStartTime(startTime)} → {calcEndTime(startTime, lv?.hours)}
              </div>
              <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{lv?.hours} hour eating window</div>
            </div>
          )}

          <button
            style={{ ...btn(), width: "100%", fontSize: 13, padding: "12px", opacity: startTime ? 1 : 0.4, cursor: startTime ? "pointer" : "not-allowed" }}
            onClick={handleConfirm}
            disabled={!startTime}>
            🔒 Lock This Week's Level
          </button>
          <div style={{ fontSize: 10, color: C.red, textAlign: "center", marginTop: 6 }}>⚠️ Cannot be changed after locking</div>
        </div>
      )}
    </div>
  );
};

const KingdomDecree = ({ ifData, startTime, decreeChecked, setDecreeChecked, totalDayCal, calorieTarget }) => {
  const [slots, setSlots] = useState(() => {
    return (ifData?.meals || ["Breakfast","Lunch","Dinner","Snack"]).map(s => ({ time:"", meal:"", slot:s }));
  });
  const [newTime, setNewTime] = useState("");
  const [newMeal, setNewMeal] = useState("");
  const [dayDone, setDayDone] = useState(false);

  const addSlot = () => {
    if(!newTime.trim() && !newMeal.trim()) return;
    setSlots(prev => [...prev, { time:newTime, meal:newMeal, slot:`custom_${Date.now()}` }]);
    setNewTime(""); setNewMeal("");
  };
  const removeSlot = (idx) => setSlots(prev => prev.filter((_,i) => i !== idx));
  const updateSlot = (idx, field, val) => {
    setSlots(prev => { const u=[...prev]; u[idx]={...u[idx],[field]:val}; return u; });
  };

  // Day wrap-up — triggers when ALL slots are checked
  const allChecked = slots.length > 0 && slots.every((_,i) => decreeChecked[i]);
  const under = totalDayCal <= calorieTarget;

  return (
    <div style={card}>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>📋 Kingdom Meal Decree</div>

      {/* Window banner */}
      {ifData && (
        <div style={{ background: ifData.color+"22", borderRadius: 8, padding: "8px 12px", marginBottom: 14, border: `1px solid ${ifData.color}44`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ fontSize: 11, color: ifData.color }}>⏱ {ifData.name} — {ifData.hours}hr window</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: ifData.color }}>{startTime ? `${formatStartTime(startTime)} → ${calcEndTime(startTime, ifData.hours)}` : ""}</div>
        </div>
      )}

      {/* Day wrap-up banner */}
      {allChecked && (
        <div style={{ background: under ? "#052e16" : "#1c0505", borderRadius: 10, padding: "14px 16px", marginBottom: 14, border: `1px solid ${under ? C.green : C.red}`, textAlign:"center" }}>
          <div style={{ fontSize: 24, marginBottom: 6 }}>{under ? "⚔️" : "🔥"}</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: under ? C.green : C.red, marginBottom: 4 }}>
            {under ? "Day Complete — Well Done Warrior!" : "Day Complete — Push Harder Tomorrow!"}
          </div>
          <div style={{ fontSize: 12, color: under ? "#6ee7b7" : "#fca5a5", lineHeight: 1.6 }}>
            {under
              ? `You stayed within your target today. ${calorieTarget - totalDayCal} kcal to spare. Eiraya is disciplined. ⚔️`
              : `${totalDayCal - calorieTarget} kcal over target today. Every warrior slips. Tomorrow — tighter discipline. You've got this. 🔥`
            }
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 8 }}>{totalDayCal} kcal eaten · Target: {calorieTarget} kcal</div>
        </div>
      )}

      <div style={{ fontSize: 11, color: C.muted, marginBottom: 12 }}>Your weekly meal plan. Tick each item as you complete it. When all done — day wraps up!</div>

      {slots.map((s, i) => {
        const checked = decreeChecked[i] || false;
        return (
          <div key={i} style={{ display:"flex", gap:8, alignItems:"flex-start", padding:"8px 0", borderBottom:`1px solid ${C.border}` }}>
            <div style={{ width:22, height:22, borderRadius:5, background:checked?C.green:"#0f0f0f", border:`1px solid ${checked?C.green:C.border}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:2, cursor:"pointer", transition:"all 0.2s" }}
              onClick={() => setDecreeChecked(prev => ({...prev,[i]:!prev[i]}))}>
              {checked && <span style={{ fontSize:12, color:"#000", fontWeight:800 }}>✓</span>}
            </div>
            <div style={{ flex:1 }}>
              <input style={{ ...inp, fontSize:11, padding:"5px 8px", marginBottom:3, color:C.gold, background:"transparent", border:"none", borderBottom:`1px solid #2a2a2a`, borderRadius:0 }}
                placeholder="Time (e.g. 9AM)" value={s.time} onChange={e => updateSlot(i,"time",e.target.value)}/>
              <input style={{ ...inp, fontSize:12, padding:"5px 8px", background:"transparent", border:"none", borderBottom:`1px solid #1a1a1a`, borderRadius:0, textDecoration:checked?"line-through":"none", color:checked?C.muted:C.text }}
                placeholder="What you'll eat..." value={s.meal} onChange={e => updateSlot(i,"meal",e.target.value)}/>
            </div>
            <button style={{ background:"none", border:"none", color:"#444", cursor:"pointer", fontSize:16, marginTop:2 }} onClick={() => removeSlot(i)}>×</button>
          </div>
        );
      })}

      {/* Add slot */}
      {!allChecked && (
        <div style={{ marginTop:12, padding:12, background:"#111", borderRadius:8 }}>
          <div style={{ fontSize:10, color:C.muted, marginBottom:8 }}>+ Add meal slot</div>
          <div style={{ display:"flex", gap:8, marginBottom:8 }}>
            <input style={{ ...inp, flex:"0 0 90px", fontSize:11 }} placeholder="Time" value={newTime} onChange={e => setNewTime(e.target.value)}/>
            <input style={{ ...inp, flex:1, fontSize:11 }} placeholder="What you'll eat..." value={newMeal} onChange={e => setNewMeal(e.target.value)} onKeyDown={e => e.key==="Enter" && addSlot()}/>
          </div>
          <button style={{ ...btn("ghost"), width:"100%", fontSize:11 }} onClick={addSlot}>+ Add Slot</button>
        </div>
      )}

      {/* DONE FOR THE DAY — final tick */}
      {slots.length > 0 && (
        <div style={{ marginTop:14, padding:14, background: dayDone?"#052e16":"#0f0f0f", borderRadius:10, border:`2px solid ${dayDone?C.green:"#333"}`, cursor:"pointer", transition:"all 0.3s" }}
          onClick={() => !dayDone && setDayDone(true)}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:28, height:28, borderRadius:7, background:dayDone?C.green:"#1a1a1a", border:`2px solid ${dayDone?C.green:"#444"}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"all 0.3s" }}>
              {dayDone && <span style={{ fontSize:16, color:"#000", fontWeight:900 }}>✓</span>}
            </div>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:dayDone?C.green:C.muted }}>
                {dayDone ? "Day Complete! ⚔️" : "Tap to mark Day as Done"}
              </div>
              <div style={{ fontSize:10, color:C.muted, marginTop:2 }}>
                {dayDone ? "Day recorded and sealed." : "Only tap when your eating window is fully done"}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Day wrap-up result — shows after dayDone */}
      {dayDone && (
        <div style={{ marginTop:12, padding:16, background: under?"#052e16":"#1c0505", borderRadius:12, border:`1px solid ${under?C.green:C.red}`, textAlign:"center" }}>
          <div style={{ fontSize:28, marginBottom:8 }}>{under ? "⚔️" : "🔥"}</div>
          <div style={{ fontSize:16, fontWeight:900, color: under?C.green:C.red, marginBottom:6 }}>
            {under ? "Well Done, Warrior!" : "Tomorrow — Fight Harder!"}
          </div>
          <div style={{ fontSize:12, color: under?"#6ee7b7":"#fca5a5", lineHeight:1.7, marginBottom:12 }}>
            {under
              ? `You stayed disciplined today. Every warrior who keeps their word builds an unbreakable character. Eiraya is winning. ⚔️`
              : `Today the battle went over. That is not failure — that is data. Tomorrow you know where to tighten. The war continues. 🔥`
            }
          </div>
          <div style={{ display:"flex", gap:8, justifyContent:"center" }}>
            <div style={{ background:"#111", borderRadius:8, padding:"8px 14px", textAlign:"center" }}>
              <div style={{ fontSize:9, color:C.muted }}>Eaten</div>
              <div style={{ fontSize:16, fontWeight:800, color:under?C.green:C.red }}>{totalDayCal}</div>
            </div>
            <div style={{ display:"flex", alignItems:"center", fontSize:16, color:C.muted }}>vs</div>
            <div style={{ background:"#111", borderRadius:8, padding:"8px 14px", textAlign:"center" }}>
              <div style={{ fontSize:9, color:C.muted }}>Target</div>
              <div style={{ fontSize:16, fontWeight:800, color:C.gold }}>{calorieTarget}</div>
            </div>
            <div style={{ display:"flex", alignItems:"center", fontSize:16, color:C.muted }}>→</div>
            <div style={{ background: under?"#0a2a0a":"#2a0a0a", borderRadius:8, padding:"8px 14px", textAlign:"center", border:`1px solid ${under?C.green:C.red}44` }}>
              <div style={{ fontSize:9, color:under?C.green:C.red }}>{under?"Deficit":"Excess"}</div>
              <div style={{ fontSize:16, fontWeight:800, color:under?C.green:C.red }}>{Math.abs(calorieTarget-totalDayCal)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


const DISC_TARGETS = [14,21,30,45,60,90];
const DISC_XP = [300,500,800,1200,2000,3500];
const INIT = {
  currentWeight: 94,
  weightLog: [],
  // RPG
  xp: 0, level: 1, sick: false, sickDays: 0,
  stats: { strength:5, agility:5, willpower:5, vitality:5, fire:0 },
  streak: 0, lastActiveDate: null, streakMultiplier: 1,
  questsCompleted: {}, weeklyQuestsCompleted: {},
  defeatedBosses: [], activeBoss: null, bossProgress: {},
  achievements: [], inventory: { weapons:["w1"], armor:[], rings:[], potions:[] },
  shieldPotionUsedMonth: null,
  // Journey
  milestonePhotos:{}, startPhoto:null, goalPhoto:null, avatarPhoto:null,
  // Meals
  meals:{}, herbal:{}, herbalCalories:{}, mealSkipped:{}, dailyCalories:{}, calorieTarget:1400,
  calorieEntries:{}, customFoods:{},
  weeklyIFLevel:{}, weeklyIFStartTime:{}, fastingDays:{}, ifLevelHistory:{}, decreeChecked:{},
  disciplineStreak:0, disciplineStreakTarget:14, lastDisciplineDate:null,
  // Mind
  journal:{}, stress:{}, mood:{}, habits: DEFAULT_HABITS, habitLog:{},
  meditationLog:{}, weeklyMeditationTarget:{},
  // Workout
  stepperLog:{}, walkLog:{}, exerciseLog:{}, currentSkill:"pushup", skillProgress:{}, winnersBoard:[],
  weeklyStepTargets:{}, manualSkill:{}, bonusLog:{},
  weeklyTrainPlan:{}, trainPlanLocked:{}, trainPlanMeta:{}, stepsWeekLocked:{},
  // Hourglass
  timerActive:false, timerStart:null, timerActivity:"Work", timerCategory:"forge", timeLog:{},
  // Oracle
  chatHistory:[],
  battleStartDate: null,
};

// ═══════════════════════════════════════════
// XP ENGINE
// ═══════════════════════════════════════════
const calcLevel = (xp) => {
  if (xp < 2000)  return { level:Math.floor(xp/400)+1,     kingdom:1 };
  if (xp < 6000)  return { level:Math.floor((xp-2000)/800)+5,  kingdom:2 };
  if (xp < 12000) return { level:Math.floor((xp-6000)/1200)+10, kingdom:3 };
  if (xp < 20000) return { level:Math.floor((xp-12000)/1600)+15,kingdom:4 };
  return { level:Math.floor((xp-20000)/3000)+20, kingdom:5 };
};
const levelXpBounds = (xp) => {
  if (xp < 2000)  { const b=Math.floor(xp/400)*400; return [b,b+400]; }
  if (xp < 6000)  { const b=2000+Math.floor((xp-2000)/800)*800; return [b,b+800]; }
  if (xp < 12000) { const b=6000+Math.floor((xp-6000)/1200)*1200; return [b,b+1200]; }
  if (xp < 20000) { const b=12000+Math.floor((xp-12000)/1600)*1600; return [b,b+1600]; }
  const b=20000+Math.floor((xp-20000)/3000)*3000; return [b,b+3000];
};

const C = {
  bg:"#0d0d0d", card:"#181818", border:"#2e2e2e",
  gold:"#f59e0b", goldDim:"#92400e", goldLight:"#fcd34d",
  text:"#f0f0f0", muted:"#7a7a7a", green:"#10b981", red:"#ef4444",
  purple:"#7c3aed", blue:"#60a5fa",
};

export default function App() {
  const [tab, setTab] = useState("realm");
  const today = getToday();
  const dayOfWeek = new Date().getDay();
  const getMondayKey = (offset=0) => {
    const d=new Date();
    d.setDate(d.getDate()-((dayOfWeek+6)%7)-(offset*7));
    return d.toISOString().split("T")[0];
  };
  const thisWeekKey = getMondayKey(0);

  const [data, setData] = useState(() => {
    try { const s = localStorage.getItem("fitquest-v29"); return s ? {...INIT,...JSON.parse(s)} : INIT; }
    catch { return INIT; }
  });

  const save = (updates) => setData(prev => {
    const next = {...prev,...updates};
    try { localStorage.setItem("fitquest-v29", JSON.stringify(next)); } catch {}
    return next;
  });

  // XP + stat grant
  const grantXP = (amount, statKey=null) => {
    const mult = data.streakMultiplier || 1;
    const gained = Math.floor(amount * mult);
    const newXP = data.xp + gained;
    const newStats = {...data.stats};
    if (statKey) newStats[statKey] = Math.min(100, (newStats[statKey]||0) + Math.ceil(amount/10));
    save({ xp: newXP, stats: newStats });
    return gained;
  };

  const loseXP = (amount) => save({ xp: Math.max(0, data.xp - amount) });

  // Streak engine
  useEffect(() => {
    const last = data.lastActiveDate;
    if (!last) return;
    const diff = Math.floor((new Date(todayIST||today) - new Date(last)) / 86400000);
    // Don't break streak on recharge day
    if (battleWeekInfo?.isRechargeDay) return;
    if (diff >= 2 && !data.sick) {
      // Streak broken
      const newStats = {...data.stats};
      const randomStat = ["strength","agility","willpower","vitality","fire"][Math.floor(Math.random()*5)];
      newStats[randomStat] = Math.max(0, (newStats[randomStat]||0) - 5);
      save({
        streak: 0, streakMultiplier: 1, sick: true, sickDays: 0,
        xp: Math.max(0, data.xp - Math.floor(data.xp * 0.1)),
        stats: newStats,
      });
    }
  }, [today]);

  // Mark quest complete
  const completeQuest = (questId) => {
    const q = DAILY_QUESTS.find(q => q.id === questId);
    if (!q) return;
    const todayQ = data.questsCompleted[today] || [];
    if (todayQ.includes(questId)) return;
    const newQ = [...todayQ, questId];
    const gained = grantXP(q.xp, questId === "workout" ? "strength" : questId === "stepper" ? "agility" : questId === "habits" ? "willpower" : questId === "meals" ? "vitality" : null);
    // Update streak
    const newStreak = data.lastActiveDate === today ? data.streak : data.streak + 1;
    const mult = newStreak >= 21 ? 4 : newStreak >= 14 ? 3 : newStreak >= 7 ? 2 : newStreak >= 3 ? 1.5 : 1;
    // All quests bonus
    const allDone = DAILY_QUESTS.every(dq => newQ.includes(dq.id));
    if (allDone) {
      save({ questsCompleted: {...data.questsCompleted,[today]:newQ}, streak:newStreak, streakMultiplier:mult, lastActiveDate:today, fire:Math.min(100, (data.stats.fire||0)+5), sick:false, sickDays:0 });
      grantXP(50);
    } else {
      save({ questsCompleted: {...data.questsCompleted,[today]:newQ}, streak:newStreak, streakMultiplier:mult, lastActiveDate:today, sick: data.sickDays >= 3 ? false : data.sick });
    }
  };

  const useShieldPotion = () => {
    const thisMonth = today.slice(0,7);
    if (data.shieldPotionUsedMonth === thisMonth) return false;
    save({ streak: data.streak, sick: false, sickDays: 0, shieldPotionUsedMonth: thisMonth });
    return true;
  };

  const {level} = calcLevel(data.xp);
  const [xpMin, xpMax] = levelXpBounds(data.xp);
  const kingdom = getKingdom(data.currentWeight);
  const completedMilestones = MILESTONES.filter(m => data.currentWeight <= m.weight);
  const activeMilestone = MILESTONES.find(m => data.currentWeight > m.weight) || MILESTONES[MILESTONES.length-1];
  const kgLost = parseFloat((94 - data.currentWeight).toFixed(1));
  const battleWeekInfo = getBattleWeekInfo(data.battleStartDate);
  const todayIST = getISTDate();
  const getPhase = (w) => w > 88 ? 1 : w > 79 ? 2 : w > 67 ? 3 : w > 55 ? 4 : 5;
  const phase = getPhase(data.currentWeight);
  const sched = WEEK_SCHEDULE[dayOfWeek];
  const todayQ = data.questsCompleted[today] || [];

  const card = { background: C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:16, marginBottom:12 };
  const inp = { background:"#111111", border:`1px solid #3a3a3a`, borderRadius:9, padding:"10px 13px", color:C.text, fontSize:13, width:"100%", boxSizing:"border-box", outline:"none" };
  const btn = (v="primary") => ({ background: v==="primary"?C.gold:v==="danger"?C.red:v==="success"?C.green:v==="purple"?"#6d28d9":"#2a2a2a", color:v==="primary"?"#000":"#fff", border:v==="ghost"?`1px solid #3a3a3a`:"none", borderRadius:9, padding:"10px 16px", cursor:"pointer", fontWeight:600, fontSize:13 });

  // ═══════════════════════════════════
  // REALM TAB — main RPG dashboard
  // ═══════════════════════════════════
  const RealmTab = () => {
    const xpProgress = ((data.xp - xpMin) / (xpMax - xpMin) * 100).toFixed(1);
    const activeBossData = BOSSES.find(b => data.activeBoss === b.id);
    const shieldAvail = data.shieldPotionUsedMonth !== today.slice(0,7);

    return (
      <div style={{padding:"16px 16px 0"}}>
        {/* Kingdom banner */}
        <div style={{...card, background:`linear-gradient(135deg, ${kingdom.bg}, #0f0f0f)`, border:`1px solid ${kingdom.color}`, marginBottom:12, position:"relative", overflow:"hidden"}}>
          {data.sick && <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:2,backdropFilter:"blur(2px)"}}><div style={{textAlign:"center"}}><div style={{fontSize:32}}>🤒</div><div style={{fontSize:14,fontWeight:700,color:C.red,marginTop:6}}>Eiraya is weakened</div><div style={{fontSize:11,color:"#aaa",marginTop:4}}>Complete 3 days of quests to recover</div>{shieldAvail&&<button style={{...btn("purple"),marginTop:10,fontSize:11}} onClick={useShieldPotion}>🧪 Use Shield Potion</button>}</div></div>}
          <div style={{fontSize:10,color:kingdom.accent,letterSpacing:3,textTransform:"uppercase",marginBottom:10}}>{kingdom.icon} {kingdom.name}</div>
          {/* Avatar — large hero */}
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",marginBottom:16}}>
            <label style={{cursor:"pointer"}}>
              <div style={{width:140,height:140,borderRadius:"50%",overflow:"hidden",border:`3px solid ${kingdom.accent}`,background:"#111",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 0 28px ${kingdom.accent}77, 0 0 60px ${kingdom.accent}33`,position:"relative"}}>
                {data.avatarPhoto
                  ? <img src={data.avatarPhoto} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                  : <div style={{textAlign:"center",padding:10}}>
                      <div style={{fontSize:44}}>⚔️</div>
                      <div style={{fontSize:9,color:kingdom.accent,marginTop:6,letterSpacing:2,textTransform:"uppercase"}}>Tap to set avatar</div>
                    </div>}
                <div style={{position:"absolute",bottom:0,left:0,right:0,background:"rgba(0,0,0,0.65)",fontSize:9,textAlign:"center",padding:"5px 0",color:kingdom.accent,letterSpacing:2,textTransform:"uppercase",fontWeight:700}}>
                  {data.avatarPhoto ? "Update Photo" : "Upload Photo"}
                </div>
              </div>
              <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{if(e.target.files[0]){const r=new FileReader();r.onload=ev=>save({avatarPhoto:ev.target.result});r.readAsDataURL(e.target.files[0]);}}}/>
            </label>
            <div style={{marginTop:10,textAlign:"center"}}>
              <div style={{fontSize:13,color:kingdom.accent,fontWeight:700,letterSpacing:2,textTransform:"uppercase"}}>Eiraya · Warrior</div>
              <div style={{fontSize:30,fontWeight:900,marginTop:2,lineHeight:1}}>Level {level}</div>
            </div>
          </div>

          {/* Kingdom + weight row */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div>
              <div style={{fontSize:10,color:kingdom.accent,letterSpacing:3,textTransform:"uppercase"}}>{kingdom.icon} {kingdom.name}</div>
              <div style={{fontSize:11,color:kingdom.textColor,lineHeight:1.6,marginTop:4,fontStyle:"italic",maxWidth:200}}>"{kingdom.desc.split(".")[0]}."</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:24,fontWeight:800,color:kingdom.accent}}>{data.currentWeight}<span style={{fontSize:11,fontWeight:400,color:C.muted}}> kg</span></div>
              <div style={{fontSize:9,color:C.muted,marginTop:2}}>{(data.currentWeight-48).toFixed(1)} kg left</div>
            </div>
          </div>

          {/* Kingdom chips */}
          <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
            {KINGDOMS.map((k,i)=>{
              const entered = data.currentWeight<=(i===0?999:KINGDOMS[i-1].minW);
              const current = kingdom.id===k.id;
              return entered ? (
                <div key={k.id} style={{fontSize:9,padding:"3px 8px",borderRadius:20,background:current?kingdom.color:"#252525",border:`1px solid ${current?kingdom.accent:"#383838"}`,color:current?kingdom.accent:"#777",fontWeight:current?700:400}}>
                  {k.icon} {current?"← HERE":k.name.split(" ")[0]}
                </div>
              ) : null;
            })}
          </div>
          {/* XP bar */}
          <div style={{marginTop:12}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.muted,marginBottom:4}}>
              <span>XP: {data.xp.toLocaleString()}</span>
              <span>Next: {xpMax.toLocaleString()}</span>
            </div>
            <div style={{height:8,background:"#1a1a1a",borderRadius:4,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${xpProgress}%`,background:`linear-gradient(90deg, ${kingdom.accent}, ${C.goldLight})`,borderRadius:4,transition:"width 1s",boxShadow:`0 0 8px ${kingdom.accent}66`}}/>
            </div>
          </div>
        </div>

        {/* Battle Week Setup / Info */}
        {!data.battleStartDate ? (
          // WELCOME SCREEN — first time setup
          <div style={{...card, background:"linear-gradient(135deg,#0a0014,#0f0f0f)", border:`1px solid #7c3aed`, marginBottom:12, textAlign:"center", padding:"28px 20px"}}>
            <div style={{fontSize:36, marginBottom:12}}>⚔️</div>
            <div style={{fontSize:11, color:"#a78bfa", letterSpacing:3, textTransform:"uppercase", marginBottom:10}}>Welcome to FitQuest</div>
            <div style={{fontSize:15, fontWeight:800, color:"#e9d5ff", lineHeight:1.7, marginBottom:6}}>
              "You are not allowed to exist before completing your goals —
            </div>
            <div style={{fontSize:15, fontWeight:800, color:"#c084fc", lineHeight:1.7, marginBottom:20}}>
              or you will lose the battle that took you almost 20 years to enter."
            </div>
            <div style={{fontSize:12, color:"#7a7a7a", marginBottom:20, lineHeight:1.6}}>
              Set your Battle Start Date. Once set, the war never stops.<br/>
              6 days of battle. Day 7 is Recharge. No gaps. No skipping.
            </div>
            <div style={{marginBottom:12}}>
              <div style={{fontSize:10, color:"#a78bfa", marginBottom:8, letterSpacing:2, textTransform:"uppercase"}}>Choose Your Battle Start Date (IST)</div>
              <input
                type="date"
                defaultValue={todayIST}
                id="battleStartInput"
                style={{...inp, textAlign:"center", fontSize:14, fontWeight:700, border:"1px solid #7c3aed", color:"#e9d5ff", background:"#0a0014"}}
              />
            </div>
            <button style={{...btn("purple"), width:"100%", fontSize:14, padding:"14px", letterSpacing:1}} onClick={()=>{
              const input = document.getElementById("battleStartInput");
              if(input?.value) save({battleStartDate: input.value});
            }}>
              ⚔️ BEGIN THE BATTLE
            </button>
          </div>
        ) : battleWeekInfo?.isRechargeDay ? (
          // RECHARGE DAY SCREEN
          <div style={{...card, background:"linear-gradient(135deg,#0a1a1a,#0f0f0f)", border:`1px solid #10b981`, marginBottom:12, textAlign:"center", padding:"24px 20px"}}>
            <div style={{fontSize:10, color:C.green, letterSpacing:3, textTransform:"uppercase", marginBottom:8}}>⚡ RECHARGE DAY</div>
            <div style={{fontSize:40, marginBottom:10}}>🛌</div>
            <div style={{fontSize:18, fontWeight:900, color:C.green, marginBottom:6}}>Week {battleWeekInfo.weekNum} — Day 7</div>
            <div style={{fontSize:13, color:"#6ee7b7", lineHeight:1.7, marginBottom:14}}>
              "Even warriors must rest. Your streak is protected.<br/>Tomorrow the next battle begins."
            </div>
            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12}}>
              <div style={{background:"#0a2a1a", borderRadius:10, padding:12, border:`1px solid ${C.green}33`}}>
                <div style={{fontSize:9, color:C.green, letterSpacing:1, textTransform:"uppercase"}}>Next Battle Starts</div>
                <div style={{fontSize:13, fontWeight:700, color:C.text, marginTop:4}}>{battleWeekInfo.rechargeDate ? (() => { const d = new Date(battleWeekInfo.rechargeDate); d.setDate(d.getDate()+1); return d.toISOString().split("T")[0]; })() : "Tomorrow"}</div>
              </div>
              <div style={{background:"#0a2a1a", borderRadius:10, padding:12, border:`1px solid ${C.green}33`}}>
                <div style={{fontSize:9, color:C.green, letterSpacing:1, textTransform:"uppercase"}}>Week Streak</div>
                <div style={{fontSize:22, fontWeight:900, color:C.green, marginTop:4}}>{battleWeekInfo.weekNum - 1} ✓</div>
              </div>
            </div>
            <div style={{fontSize:11, color:C.muted}}>🧘 Meditation and walks still earn XP today</div>
          </div>
        ) : battleWeekInfo ? (
          // ACTIVE BATTLE WEEK CARD
          <div style={{...card, background:"linear-gradient(135deg,#0d0500,#0f0f0f)", border:`1px solid ${C.goldDim}`, marginBottom:12}}>
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12}}>
              <div>
                <div style={{fontSize:10, color:C.gold, letterSpacing:3, textTransform:"uppercase", marginBottom:4}}>⚔️ Active Battle Week</div>
                <div style={{fontSize:22, fontWeight:900, color:C.gold}}>Week {battleWeekInfo.weekNum}</div>
                <div style={{fontSize:11, color:C.muted, marginTop:2}}>📅 {battleWeekInfo.weekStart} → {battleWeekInfo.weekEnd}</div>
                <div style={{fontSize:11, color:"#818cf8", marginTop:2}}>🛌 Recharge: {battleWeekInfo.rechargeDate}</div>
              </div>
              <div style={{textAlign:"center", background:"#1c0f00", borderRadius:12, padding:"10px 14px", border:`1px solid ${C.goldDim}`}}>
                <div style={{fontSize:9, color:C.muted, letterSpacing:1, textTransform:"uppercase"}}>Battle Day</div>
                <div style={{fontSize:32, fontWeight:900, color:C.gold, lineHeight:1}}>{battleWeekInfo.battleDayNum}</div>
                <div style={{fontSize:9, color:C.muted}}>of 6</div>
              </div>
            </div>
            {/* 6-day progress bar */}
            <div style={{display:"flex", gap:4, marginBottom:6}}>
              {Array.from({length:6}).map((_,i) => (
                <div key={i} style={{flex:1, height:8, borderRadius:4, background: i < battleWeekInfo.dayInCycle ? C.gold : i === battleWeekInfo.dayInCycle ? C.goldDim : "#1a1a1a", border: i === battleWeekInfo.dayInCycle ? `1px solid ${C.gold}` : "none", transition:"all 0.3s"}}/>
              ))}
            </div>
            <div style={{display:"flex", justifyContent:"space-between", fontSize:9, color:C.muted}}>
              <span>Day 1</span>
              <span style={{color:C.gold, fontWeight:700}}>{6 - battleWeekInfo.dayInCycle} days left in this battle week</span>
              <span>Day 6</span>
            </div>
          </div>
        ) : null}

        {/* Stats */}
        <div style={card}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:12}}>⚔️ Character Stats</div>
          {[
            {key:"strength", label:"⚔️ Strength",  color:"#ef4444"},
            {key:"agility",  label:"🏃 Agility",   color:"#3b82f6"},
            {key:"willpower",label:"🧠 Willpower",  color:"#8b5cf6"},
            {key:"vitality", label:"💚 Vitality",  color:"#10b981"},
            {key:"fire",     label:"🔥 Fire",       color:"#f59e0b"},
          ].map(s => (
            <div key={s.key} style={{marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{fontSize:12}}>{s.label}</span>
                <span style={{fontSize:12,color:s.color,fontWeight:700}}>{data.stats[s.key]||0}/100</span>
              </div>
              <div style={{height:6,background:"#1a1a1a",borderRadius:3,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${data.stats[s.key]||0}%`,background:s.color,borderRadius:3,transition:"width 0.8s",boxShadow:`0 0 6px ${s.color}44`}}/>
              </div>
            </div>
          ))}
        </div>

        {/* Streak */}
        <div style={{...card,border:`1px solid ${data.streak>=7?"#f59e0b44":C.border}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:13,fontWeight:700}}>🔥 Battle Streak</div>
              <div style={{fontSize:11,color:C.muted,marginTop:2}}>Multiplier: <span style={{color:C.gold,fontWeight:700}}>{data.streakMultiplier}×</span></div>
            </div>
            <div style={{fontSize:40,fontWeight:900,color:data.streak>=7?C.gold:C.muted}}>{data.streak}<span style={{fontSize:14,color:C.muted,fontWeight:400}}> days</span></div>
          </div>
          <div style={{display:"flex",gap:8,marginTop:10}}>
            {[[3,"1.5×"],[7,"2×"],[14,"3×"],[21,"4×"]].map(([d,m]) => (
              <div key={d} style={{flex:1,textAlign:"center",padding:"6px 4px",borderRadius:8,background:data.streak>=d?"#1c0f00":"#111",border:`1px solid ${data.streak>=d?C.goldDim:C.border}`}}>
                <div style={{fontSize:11,color:data.streak>=d?C.gold:C.muted,fontWeight:700}}>{m}</div>
                <div style={{fontSize:9,color:C.muted,marginTop:2}}>{d}d</div>
              </div>
            ))}
          </div>
        </div>

        {/* Active Boss */}
        {activeBossData && (
          <div style={{...card,border:`1px solid #ef444444`,background:"#0d0000"}}>
            <div style={{fontSize:10,color:C.red,letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>⚠️ Boss Battle Active</div>
            <div style={{display:"flex",gap:12,alignItems:"center"}}>
              <div style={{fontSize:44}}>{activeBossData.icon}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:16,fontWeight:800,color:C.red}}>{activeBossData.name}</div>
                <div style={{fontSize:11,color:"#aaa",marginTop:4}}>{activeBossData.attack}</div>
                <div style={{fontSize:11,color:C.gold,marginTop:6}}>Weakness: {activeBossData.weakness}</div>
              </div>
            </div>
            {/* Boss HP */}
            <div style={{marginTop:12}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.muted,marginBottom:4}}>
                <span>Boss HP</span>
                <span>{activeBossData.hp - (data.bossProgress[activeBossData.id]||0)}/{activeBossData.hp}</span>
              </div>
              <div style={{height:8,background:"#1a1a1a",borderRadius:4,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${((activeBossData.hp-(data.bossProgress[activeBossData.id]||0))/activeBossData.hp)*100}%`,background:C.red,borderRadius:4,transition:"width 0.8s"}}/>
              </div>
            </div>
          </div>
        )}

        {/* Daily Quests */}
        <div style={card}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div style={{fontSize:13,fontWeight:700}}>📜 Daily Quests</div>
            <div style={{fontSize:11,color:C.gold}}>{todayQ.length}/{DAILY_QUESTS.length} done</div>
          </div>
          {DAILY_QUESTS.map(q => {
            const done = todayQ.includes(q.id);
            return (
              <div key={q.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:`1px solid ${C.border}`,cursor:done?"default":"pointer",opacity:done?0.5:1}}
                onClick={() => !done && completeQuest(q.id)}>
                <div style={{width:28,height:28,borderRadius:7,background:done?C.gold:"#0f0f0f",border:`1px solid ${done?C.gold:C.border}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all 0.2s"}}>
                  <span style={{fontSize:done?11:14,color:done?"#000":"inherit",fontWeight:done?800:400}}>{done?"✓":q.icon}</span>
                </div>
                <span style={{flex:1,fontSize:13,textDecoration:done?"line-through":"none"}}>{q.label}</span>
                <span style={{fontSize:11,color:done?C.muted:C.gold,fontWeight:700}}>+{q.xp} XP</span>
              </div>
            );
          })}
          {todayQ.length === DAILY_QUESTS.length && (
            <div style={{marginTop:10,padding:10,background:"#0a1a00",borderRadius:8,border:`1px solid #10b98144`,textAlign:"center"}}>
              <div style={{fontSize:14,fontWeight:800,color:C.green}}>⚔️ ALL QUESTS COMPLETE +50 BONUS XP!</div>
            </div>
          )}
        </div>

        {/* World Map — zones */}
        <div style={card}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:12}}>🗺️ World Map</div>
          {KINGDOMS.map((k,i) => {
            const entered = data.currentWeight <= (i===0 ? 999 : KINGDOMS[i-1].minW);
            const current = kingdom.id === k.id;
            return (
              <div key={k.id} style={{display:"flex",gap:12,alignItems:"center",padding:"10px 0",borderBottom:i<KINGDOMS.length-1?`1px solid ${C.border}`:"none",opacity:entered?1:0.3}}>
                <div style={{fontSize:28,filter:!entered?"grayscale(1)":"none"}}>{k.icon}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:700,color:current?k.accent:C.text}}>{k.name} {current&&"← YOU ARE HERE"}</div>
                  <div style={{fontSize:10,color:C.muted,marginTop:2}}>{k.range}</div>
                </div>
                {current && <div style={{width:10,height:10,borderRadius:"50%",background:k.accent,boxShadow:`0 0 8px ${k.accent}`}}/>}
                {!entered && <div style={{fontSize:12,color:C.muted}}>🔒</div>}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════
  // JOURNEY TAB
  // ═══════════════════════════════════
  const JourneyTab = () => {
    const [newW, setNewW] = useState("");
    const [flash, setFlash] = useState(null); // "victory" | "defeat" | "neutral"
    const [viewMonth, setViewMonth] = useState(() => {
      const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
    });

    const sortedLog = [...data.weightLog].sort((a,b)=>a.date.localeCompare(b.date));

    const getBattleResult = (date) => {
      const idx = sortedLog.findIndex(l=>l.date===date);
      if(idx < 0) return null; // no log
      const curr = sortedLog[idx];
      // Compare to previous log entry, or to starting weight 94 if first entry
      const prevWeight = idx === 0 ? 94 : sortedLog[idx-1].weight;
      if(curr.weight < prevWeight) return "victory";
      if(curr.weight > prevWeight) return "defeat";
      return "neutral";
    };

    const logWeight = () => {
      const w = parseFloat(newW);
      if(isNaN(w)||w<30||w>200) return;
      const prev = data.weightLog.filter(l=>l.date!==today).sort((a,b)=>b.date.localeCompare(a.date))[0];
      const log = [...data.weightLog.filter(l=>l.date!==today),{date:today,weight:w}];
      save({currentWeight:w, weightLog:log});
      completeQuest("weight");
      // Trigger flash
      if(!prev) { setFlash("neutral"); }
      else if(w < prev.weight) setFlash("victory");
      else if(w > prev.weight) setFlash("defeat");
      else setFlash("neutral");
      setTimeout(()=>setFlash(null), 2800);
      setNewW("");
    };

    // Battle stats for viewed month
    const [yr, mo] = viewMonth.split("-").map(Number);
    const daysInMonth = new Date(yr, mo, 0).getDate();
    const firstDayOfMonth = new Date(yr, mo-1, 1).getDay(); // 0=Sun
    const adjustedFirstDay = (firstDayOfMonth+6)%7; // Mon=0

    const monthResults = {};
    for(let d=1;d<=daysInMonth;d++){
      const ds = `${yr}-${String(mo).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
      monthResults[ds] = getBattleResult(ds);
    }
    const victories = Object.values(monthResults).filter(r=>r==="victory").length;
    const defeats   = Object.values(monthResults).filter(r=>r==="defeat").length;
    const neutrals  = Object.values(monthResults).filter(r=>r==="neutral").length;
    const logged    = Object.values(monthResults).filter(r=>r!==null).length;

    // Running victory streak (from today backwards)
    const calcVictoryStreak = () => {
      let streak=0;
      const d=new Date();
      for(let i=0;i<365;i++){
        const ds=d.toISOString().split("T")[0];
        const r=getBattleResult(ds);
        if(r==="victory"){streak++;}
        else if(r==="defeat") break;
        d.setDate(d.getDate()-1);
      }
      return streak;
    };
    const victoryStreak = calcVictoryStreak();

    const graphData = sortedLog.slice(-30);

    const RESULT_STYLES = {
      victory: { bg:"#052e16", border:"#10b981", text:"#6ee7b7", icon:"⚔️", label:"Victory"  },
      defeat:  { bg:"#1c0505", border:"#ef4444", text:"#fca5a5", icon:"💀", label:"Defeat"   },
      neutral: { bg:"#0f0f1a", border:"#6366f1", text:"#a5b4fc", icon:"🛡️", label:"Draw"     },
      null:    { bg:"#111",    border:"#2a2a2a", text:"#333",    icon:"",   label:""          },
    };

    const prevMonth = () => {
      const d=new Date(yr,mo-2,1);
      setViewMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`);
    };
    const nextMonth = () => {
      const d=new Date(yr,mo,1);
      const now=new Date();
      if(d<=now) setViewMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`);
    };

    const monthName = new Date(yr,mo-1,1).toLocaleString("default",{month:"long",year:"numeric"});

    return (
      <div style={{padding:"16px 16px 0"}}>

        {/* Flash overlay */}
        {flash && (
          <div style={{position:"fixed",inset:0,zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none",animation:"fadeOut 2.8s ease forwards"}}>
            <style>{`@keyframes fadeOut{0%{opacity:1}70%{opacity:1}100%{opacity:0}} @keyframes popIn{0%{transform:scale(0.5);opacity:0}60%{transform:scale(1.15)}100%{transform:scale(1);opacity:1}}`}</style>
            <div style={{background:flash==="victory"?"#052e16":flash==="defeat"?"#1c0505":"#0f0f1a",border:`3px solid ${flash==="victory"?C.green:flash==="defeat"?C.red:"#6366f1"}`,borderRadius:20,padding:"32px 40px",textAlign:"center",animation:"popIn 0.4s ease",boxShadow:`0 0 40px ${flash==="victory"?C.green:flash==="defeat"?C.red:"#6366f1"}44`}}>
              <div style={{fontSize:52}}>{flash==="victory"?"⚔️":flash==="defeat"?"💀":"🛡️"}</div>
              <div style={{fontSize:22,fontWeight:900,color:flash==="victory"?C.green:flash==="defeat"?C.red:"#818cf8",marginTop:8}}>
                {flash==="victory"?"VICTORY!":flash==="defeat"?"DEFEAT":"DRAW"}
              </div>
              <div style={{fontSize:12,color:flash==="victory"?"#6ee7b7":flash==="defeat"?"#fca5a5":"#a5b4fc",marginTop:6}}>
                {flash==="victory"?"The scales tip in your favour ⚔️":flash==="defeat"?"The battle is lost. The war continues.":"No ground gained or lost today."}
              </div>
            </div>
          </div>
        )}

        {/* Log weight */}
        <div style={card}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:10}}>⚖️ Log Today's Weight → +10 XP</div>
          <div style={{display:"flex",gap:8}}>
            <input style={{...inp,flex:1}} type="number" placeholder="e.g. 93.5" value={newW}
              onChange={e=>setNewW(e.target.value)} onKeyDown={e=>e.key==="Enter"&&logWeight()}/>
            <button style={btn()} onClick={logWeight}>Log</button>
          </div>
          <div style={{fontSize:12,color:C.muted,marginTop:8}}>
            Current: <span style={{color:C.gold,fontWeight:700}}>{data.currentWeight} kg</span>
            {" · "}Lost: <span style={{color:C.green,fontWeight:700}}>{kgLost} kg</span>
          </div>
        </div>

        {/* Battle Stats — this month */}
        <div style={{...card,background:"linear-gradient(135deg,#0a0a00,#111)",border:`1px solid ${C.goldDim}`}}>
          <div style={{fontSize:10,color:C.gold,letterSpacing:2,textTransform:"uppercase",marginBottom:10}}>⚔️ Battle Record · {monthName}</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:10}}>
            {[
              {icon:"⚔️",label:"Victories",val:victories,color:C.green},
              {icon:"💀",label:"Defeats",  val:defeats,  color:C.red  },
              {icon:"🛡️",label:"Draws",    val:neutrals, color:"#818cf8"},
              {icon:"📅",label:"Logged",   val:logged,   color:C.gold },
            ].map(s=>(
              <div key={s.label} style={{background:"#0a0a0a",borderRadius:10,padding:"10px 8px",textAlign:"center",border:`1px solid ${s.color}22`}}>
                <div style={{fontSize:18}}>{s.icon}</div>
                <div style={{fontSize:20,fontWeight:900,color:s.color,lineHeight:1.1,marginTop:4}}>{s.val}</div>
                <div style={{fontSize:8,color:C.muted,textTransform:"uppercase",letterSpacing:1,marginTop:2}}>{s.label}</div>
              </div>
            ))}
          </div>
          {victoryStreak>0&&(
            <div style={{background:"#052e16",borderRadius:8,padding:"8px 12px",border:`1px solid ${C.green}44`,fontSize:12,color:C.green}}>
              🔥 <span style={{fontWeight:700}}>{victoryStreak}-day victory streak</span> — keep going!
            </div>
          )}
        </div>

        {/* Battle Calendar */}
        <div style={card}>
          {/* Month nav */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <button style={{...btn("ghost"),padding:"5px 12px",fontSize:12}} onClick={prevMonth}>← Prev</button>
            <div style={{fontSize:13,fontWeight:700}}>{monthName}</div>
            <button style={{...btn("ghost"),padding:"5px 12px",fontSize:12}} onClick={nextMonth}>Next →</button>
          </div>

          {/* Day headers */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:3}}>
            {["Mo","Tu","We","Th","Fr","Sa","Su"].map(d=>(
              <div key={d} style={{textAlign:"center",fontSize:9,color:C.muted,padding:"2px 0",fontWeight:600}}>{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>
            {/* Empty cells before month start */}
            {Array.from({length:adjustedFirstDay}).map((_,i)=>(
              <div key={`e${i}`} style={{aspectRatio:"1",borderRadius:6}}/>
            ))}
            {/* Day tiles */}
            {Array.from({length:daysInMonth}).map((_,i)=>{
              const day = i+1;
              const ds  = `${yr}-${String(mo).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
              const result = monthResults[ds];
              const style = RESULT_STYLES[result] || RESULT_STYLES.null;
              const isToday = ds===today;
              const logEntry = data.weightLog.find(l=>l.date===ds);
              return (
                <div key={day} style={{
                  aspectRatio:"1", borderRadius:6,
                  background:result==="victory"?"#052e16":result==="defeat"?"#1c0505":result==="neutral"?"#0f0f1a":"#111",
                  border:`2px solid ${isToday?kingdom.accent:result==="victory"?C.green:result==="defeat"?C.red:result==="neutral"?"#6366f1":"#2a2a2a"}`,
                  display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
                  position:"relative",
                  boxShadow:isToday?`0 0 8px ${kingdom.accent}66`:result==="victory"?`0 0 4px ${C.green}44`:result==="defeat"?`0 0 4px ${C.red}44`:"none",
                  transition:"all 0.2s",
                  padding:2,
                }}>
                  <div style={{fontSize:8,color:isToday?kingdom.accent:result==="victory"?"#6ee7b7":result==="defeat"?"#fca5a5":result==="neutral"?"#a5b4fc":C.muted,fontWeight:isToday||result?700:400,lineHeight:1.2}}>{day}</div>
                  {logEntry&&<div style={{fontSize:8,color:result==="victory"?C.green:result==="defeat"?C.red:result==="neutral"?"#818cf8":C.muted,fontWeight:700,lineHeight:1.1,marginTop:1}}>{logEntry.weight}</div>}
                  {result&&<div style={{fontSize:9,lineHeight:1}}>{result==="victory"?"⚔️":result==="defeat"?"💀":"🛡️"}</div>}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{display:"flex",gap:12,justifyContent:"center",marginTop:12,flexWrap:"wrap"}}>
            {Object.entries(RESULT_STYLES).filter(([k])=>k!=="null").map(([key,s])=>(
              <div key={key} style={{display:"flex",alignItems:"center",gap:4}}>
                <div style={{width:10,height:10,borderRadius:2,background:s.bg,border:`1px solid ${s.border}`}}/>
                <span style={{fontSize:9,color:C.muted}}>{s.icon} {s.label}</span>
              </div>
            ))}
            <div style={{display:"flex",alignItems:"center",gap:4}}>
              <div style={{width:10,height:10,borderRadius:2,background:"#111",border:"1px solid #2a2a2a"}}/>
              <span style={{fontSize:9,color:C.muted}}>Not logged</span>
            </div>
          </div>
        </div>

        {/* Train Track */}
        <div style={{...card,padding:"16px 0"}}>
          <div style={{fontSize:13,fontWeight:700,padding:"0 16px",marginBottom:4}}>🚂 Quest Track</div>
          <div style={{fontSize:11,color:C.muted,padding:"0 16px",marginBottom:14}}>Scroll → tap station to upload photo</div>
          <div style={{overflowX:"auto",paddingBottom:8}}>
            <div style={{display:"flex",alignItems:"center",minWidth:(MILESTONES.length+2)*108+32,padding:"0 16px",position:"relative"}}>
              <div style={{position:"absolute",top:52,left:56,right:56,height:5,background:"#1a1a1a",borderRadius:99,zIndex:0}}>
                <div style={{height:"100%",width:`${(completedMilestones.length/15*100).toFixed(1)}%`,background:`linear-gradient(90deg, ${kingdom.accent}, ${C.goldLight})`,borderRadius:99,transition:"width 1.2s ease",boxShadow:`0 0 10px ${kingdom.accent}55`}}/>
              </div>
              {/* Start */}
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",zIndex:1,marginRight:28,flexShrink:0,width:88}}>
                <label style={{cursor:"pointer"}}>
                  <div style={{width:78,height:78,borderRadius:10,overflow:"hidden",border:`2px solid ${kingdom.accent}`,background:"#0f0f0f",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                    {data.startPhoto?<img src={data.startPhoto} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<><span style={{fontSize:22}}>📸</span><span style={{fontSize:8,color:C.muted,marginTop:3}}>Upload</span></>}
                  </div>
                  <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{if(e.target.files[0]){const r=new FileReader();r.onload=ev=>save({startPhoto:ev.target.result});r.readAsDataURL(e.target.files[0]);}}}/>
                </label>
                <div style={{fontSize:10,color:kingdom.accent,fontWeight:700,marginTop:5}}>94 kg</div>
                <div style={{fontSize:8,color:C.muted,letterSpacing:1}}>DAY ONE</div>
              </div>
              {/* Stations */}
              {MILESTONES.map(m=>{
                const done=data.currentWeight<=m.weight;
                const active=activeMilestone.id===m.id;
                return (
                  <div key={m.id} style={{display:"flex",flexDirection:"column",alignItems:"center",zIndex:1,marginRight:20,flexShrink:0,width:88}}>
                    <label style={{cursor:"pointer"}}>
                      <div style={{width:60,height:60,borderRadius:"50%",background:done?`radial-gradient(circle, ${kingdom.accent}, ${kingdom.color})`:"#0f0f0f",border:`2px solid ${done?kingdom.accent:active?kingdom.color:"#222"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,overflow:"hidden",position:"relative",boxShadow:active?`0 0 18px ${kingdom.color}`:"none",transition:"all 0.3s"}}>
                        {data.milestonePhotos[m.id]?<img src={data.milestonePhotos[m.id]} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span style={{opacity:done?1:0.2}}>{m.emoji}</span>}
                        {active&&<div style={{position:"absolute",bottom:0,width:"100%",background:"rgba(0,0,0,0.75)",fontSize:7,textAlign:"center",padding:2,color:kingdom.accent,fontWeight:700}}>NOW</div>}
                      </div>
                      <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{if(e.target.files[0]){const r=new FileReader();r.onload=ev=>save({milestonePhotos:{...data.milestonePhotos,[m.id]:ev.target.result}});r.readAsDataURL(e.target.files[0]);}}}/>
                    </label>
                    <div style={{fontSize:10,color:done?kingdom.accent:active?kingdom.accent:C.muted,fontWeight:done||active?700:400,marginTop:5}}>{m.weight} kg</div>
                    <div style={{fontSize:7,color:C.muted,textAlign:"center",maxWidth:84,marginTop:2,lineHeight:1.3}}>{m.msg.split(" — ")[0]}</div>
                  </div>
                );
              })}
              {/* Goal */}
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",zIndex:1,flexShrink:0,width:88}}>
                <label style={{cursor:"pointer"}}>
                  <div style={{width:78,height:78,borderRadius:10,overflow:"hidden",border:"2px solid #7c3aed",background:"#0f0f0f",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                    {data.goalPhoto?<img src={data.goalPhoto} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<><span style={{fontSize:22}}>✨</span><span style={{fontSize:8,color:C.muted,marginTop:3}}>Upload</span></>}
                  </div>
                  <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{if(e.target.files[0]){const r=new FileReader();r.onload=ev=>save({goalPhoto:ev.target.result});r.readAsDataURL(e.target.files[0]);}}}/>
                </label>
                <div style={{fontSize:10,color:"#7c3aed",fontWeight:700,marginTop:5}}>48 kg</div>
                <div style={{fontSize:8,color:C.muted,letterSpacing:1}}>EIRAYA ✨</div>
              </div>
            </div>
          </div>
        </div>

        {/* Weight trend graph */}
        {graphData.length>1&&(
          <div style={card}>
            <div style={{fontSize:13,fontWeight:700,marginBottom:10}}>Battle Trend (last 30 days)</div>
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={graphData}>
                <XAxis dataKey="date" tick={{fontSize:9,fill:C.muted}} tickFormatter={d=>d.slice(5)}/>
                <YAxis domain={["dataMin - 1","dataMax + 1"]} tick={{fontSize:9,fill:C.muted}} width={35}/>
                <Tooltip contentStyle={{background:"#1a1a1a",border:`1px solid ${C.border}`,borderRadius:8,fontSize:11}}/>
                <Line type="monotone" dataKey="weight" stroke={kingdom.accent} strokeWidth={2.5} dot={({cx,cy,payload})=>{
                  const r=getBattleResult(payload.date);
                  const col=r==="victory"?C.green:r==="defeat"?C.red:r==="neutral"?"#818cf8":C.muted;
                  return <circle key={payload.date} cx={cx} cy={cy} r={4} fill={col} stroke={col}/>;
                }}/>
              </LineChart>
            </ResponsiveContainer>
            <div style={{fontSize:10,color:C.muted,textAlign:"center",marginTop:6}}>Dots: <span style={{color:C.green}}>⚔️ Victory</span> · <span style={{color:C.red}}>💀 Defeat</span> · <span style={{color:"#818cf8"}}>🛡️ Draw</span></div>
          </div>
        )}
      </div>
    );
  };

  // ═══════════════════════════════════
  // INVENTORY TAB
  // ═══════════════════════════════════
  const InventoryTab = () => {
    const totalWorkouts = Object.keys(data.exerciseLog||{}).length;
    const totalStepperSteps = Object.values(data.stepperLog||{}).reduce((a,b)=>a+b,0);
    const earned = {
      weapons: INVENTORY_ITEMS.weapons.filter((_,i) => i===0 || (i===1&&totalWorkouts>=7) || (i===2&&totalWorkouts>=30)),
      armor:   INVENTORY_ITEMS.armor.filter((_,i)   => i===0&&data.streak>=3 || (i===1&&data.streak>=7) || (i===2&&data.streak>=21)),
      rings:   INVENTORY_ITEMS.rings.filter((_,i)   => i===0&&data.winnersBoard.includes("pushup") || (i===1&&totalStepperSteps>=2000) || (i===2&&data.streak>=14)),
      potions: data.shieldPotionUsedMonth!==today.slice(0,7) ? INVENTORY_ITEMS.potions : [],
    };
    const shieldAvail = data.shieldPotionUsedMonth !== today.slice(0,7);

    return (
      <div style={{padding:"16px 16px 0"}}>
        <div style={{...card,background:"linear-gradient(135deg,#1c1400,#0f0f0f)",border:`1px solid ${C.goldDim}`}}>
          <div style={{fontSize:10,color:C.gold,letterSpacing:3,textTransform:"uppercase",marginBottom:4}}>⚔️ EIRAYA'S INVENTORY</div>
          <div style={{fontSize:12,color:C.muted}}>Items earned through real-world actions</div>
        </div>
        {[
          {label:"⚔️ Weapons", items:INVENTORY_ITEMS.weapons, cat:"weapons"},
          {label:"🛡️ Armor",   items:INVENTORY_ITEMS.armor,   cat:"armor"},
          {label:"💍 Rings",   items:INVENTORY_ITEMS.rings,   cat:"rings"},
          {label:"🧪 Potions", items:INVENTORY_ITEMS.potions, cat:"potions"},
        ].map(section=>(
          <div key={section.cat} style={card}>
            <div style={{fontSize:13,fontWeight:700,marginBottom:12}}>{section.label}</div>
            {section.items.map(item=>{
              const have = earned[section.cat]?.some(e=>e.id===item.id) || (section.cat==="potions"&&shieldAvail);
              return (
                <div key={item.id} style={{display:"flex",gap:12,alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${C.border}`,opacity:have?1:0.3}}>
                  <div style={{fontSize:32,filter:have?"none":"grayscale(1)"}}>{item.icon}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:14,fontWeight:700,color:have?C.gold:C.muted}}>{item.name}</div>
                    <div style={{fontSize:11,color:C.muted,marginTop:2}}>{item.stat||item.effect}</div>
                    <div style={{fontSize:10,color:have?C.green:C.muted,marginTop:2}}>{have?"✓ Equipped":"🔒 "+item.req}</div>
                  </div>
                  {item.id==="p1"&&have&&<button style={{...btn("purple"),fontSize:11,padding:"6px 12px"}} onClick={()=>useShieldPotion()}>Use</button>}
                </div>
              );
            })}
          </div>
        ))}

        {/* Achievements */}
        <div style={card}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:12}}>🏅 Achievements</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {ACHIEVEMENTS.map(a=>{
              const earned = data.achievements?.includes(a.id) ||
                (a.id==="first_blood"&&Object.keys(data.exerciseLog||{}).length>0) ||
                (a.id==="iron_will"&&data.streak>=7) ||
                (a.id==="warrior"&&kgLost>=10) ||
                (a.id==="half_way"&&kgLost>=23) ||
                (a.id==="unleashed"&&data.currentWeight<=48);
              return (
                <div key={a.id} style={{padding:"7px 12px",borderRadius:20,background:earned?"#1c1400":"#111",border:`1px solid ${earned?C.gold:C.border}`,opacity:earned?1:0.35}}>
                  <span style={{fontSize:14}}>{a.icon}</span>
                  <span style={{fontSize:11,color:earned?C.goldLight:C.muted,marginLeft:5,fontWeight:earned?700:400}}>{a.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════
  // WORKOUT TAB — fully upgraded
  // ═══════════════════════════════════
  const WorkoutTab = () => {
    const [wTab, setWTab] = useState("steps");
    const [exView, setExView] = useState("plan");
    const todayStepper = data.stepperLog?.[today]||0;
    const todayWalk    = data.walkLog?.[today]||0;
    const todayExLog   = data.exerciseLog?.[today]||{};

    // Week key: Monday of current week
    const getMondayKey = (offset=0) => { const d=new Date(); d.setDate(d.getDate()-((dayOfWeek+6)%7)-(offset*7)); return d.toISOString().split("T")[0]; };
    const thisWeekKey  = getMondayKey(0);
    const lastWeekKey  = getMondayKey(1);

    // Manual weekly targets stored by monday-key
    const weekTargets  = data.weeklyStepTargets || {};
    const thisTarget   = weekTargets[thisWeekKey] || { stepper:2000, walking:2000 };
    const lastTarget   = weekTargets[lastWeekKey] || { stepper:0, walking:0 };

        const getWeekTotal = (log,off=0) => getDayDates(off).reduce((s,d)=>s+(log?.[d]||0),0);
    const stepperWeekTotal = getWeekTotal(data.stepperLog,0);
    const walkWeekTotal    = getWeekTotal(data.walkLog,0);
    const last4 = Array.from({length:4},(_,wi)=>({week:wi===0?"This":wi===1?"Last":`${wi+1}w ago`,stepper:getWeekTotal(data.stepperLog,wi),walking:getWeekTotal(data.walkLog,wi)})).reverse();

    // Dumbbell challenge plans
    const CHALLENGES = {
      upper:[
        {name:"Bicep Curl 21s",          equip:"5kg 💪", sets:3, reps:"7+7+7", note:"Lower half × 7, upper half × 7, full × 7"},
        {name:"Arnold Press",             equip:"5kg 💪", sets:4, reps:12,     note:"Rotate wrists as you press up"},
        {name:"Lateral Raise Drop Set",   equip:"5→2kg",  sets:3, reps:"10+10",note:"5kg to fail, drop to 2kg immediately"},
        {name:"Hammer Curl",              equip:"5kg 💪", sets:4, reps:12,     note:"Neutral grip, elbows pinned"},
        {name:"Upright Row",              equip:"5kg 💪", sets:3, reps:12,     note:"Pull elbows high, slow down"},
        {name:"Overhead Tricep Extension",equip:"5kg 💪", sets:3, reps:15,     note:"Both hands, full stretch at bottom"},
      ],
      lower:[
        {name:"Goblet Squat Ladder",      equip:"5kg 💪", sets:1, reps:"5-10-15",note:"5 reps, rest 10s, 10 reps, rest 10s, 15 reps"},
        {name:"Romanian Deadlift",        equip:"5kg 💪", sets:4, reps:12,     note:"Hinge at hips, feel the hamstring stretch"},
        {name:"Walking Lunges",           equip:"5kg 💪", sets:3, reps:20,     note:"Alternate legs, keep torso upright"},
        {name:"Sumo Squat Pulse",         equip:"5kg 💪", sets:3, reps:"12+10 pulse",note:"12 full reps then 10 pulses at bottom"},
        {name:"Single Leg Deadlift",      equip:"5kg 💪", sets:3, reps:10,     note:"Balance on one leg, hinge slow"},
        {name:"Weighted Glute Bridge",    equip:"5kg 💪", sets:4, reps:15,     note:"Hold 2s at top, squeeze hard"},
      ],
      full:[
        {name:"Dumbbell Thruster",        equip:"5kg 💪", sets:4, reps:12,     note:"Squat → press in one explosive movement"},
        {name:"Renegade Row",             equip:"5kg 💪", sets:3, reps:10,     note:"Plank position, row each arm alternately"},
        {name:"Dumbbell Deadlift",        equip:"5kg 💪", sets:4, reps:15,     note:"Full hip hinge, bar path close to legs"},
        {name:"Squat to Curl to Press",   equip:"5kg 💪", sets:3, reps:10,     note:"3 movements in 1 — total body chain"},
        {name:"Bent Over Row",            equip:"5kg 💪", sets:4, reps:12,     note:"45° hinge, pull elbows back not out"},
        {name:"Reverse Lunge to Curl",    equip:"5kg 💪", sets:3, reps:10,     note:"Step back into lunge, curl at bottom"},
      ],
      recovery:[
        {name:"Cat-Cow Flow",             equip:"Yoga 🧘",sets:1,reps:1,note:"10 slow reps, sync with breath"},
        {name:"Downward Dog Hold",        equip:"Yoga 🧘",sets:3,reps:1,note:"Hold 30s, pedal feet"},
        {name:"Pigeon Pose",              equip:"Yoga 🧘",sets:2,reps:1,note:"45s each side, breathe into tightness"},
        {name:"Seated Forward Fold",      equip:"Yoga 🧘",sets:2,reps:1,note:"Hold 30s, reach for your toes"},
        {name:"Supine Twist",             equip:"Yoga 🧘",sets:2,reps:1,note:"30s each side, relax shoulders"},
      ],
    };
    const todayChallenges = CHALLENGES[sched.type] || CHALLENGES.recovery;

    // Manual Skill Builder
    const manualSkill = data.manualSkill || { name:"", steps:[], weekPlan:{}, weekKey:"", dailyLogs:{}, completedSteps:[], mastered:false };
    const isThisWeek  = manualSkill.weekKey === thisWeekKey;
    const todayPlan   = isThisWeek ? (manualSkill.weekPlan?.[today]||"") : "";
    const todaySkillLog = manualSkill.dailyLogs?.[today]||"";

    // Bonus board
    const bonusLog = data.bonusLog || {};
    const todayBonus = bonusLog[today] || [];

    const wBtn = (id,label) => (
      <button onClick={()=>setWTab(id)} style={{padding:"8px 14px",borderRadius:8,border:"none",background:wTab===id?C.gold:"#1a1a1a",color:wTab===id?"#000":C.muted,fontWeight:wTab===id?700:400,fontSize:12,cursor:"pointer",whiteSpace:"nowrap"}}>{label}</button>
    );

    // ── STEPS ──
    const StepsSection = () => {
      const [si,setSi] = useState("");
      const [wi,setWi] = useState("");
      const [setupMode,setSetupMode] = useState(false);
      const [weekLabel,setWeekLabel] = useState("");
      const [ts,setTs] = useState("");
      const [tw,setTw] = useState("");

      const getIST = () => {
        const now = new Date();
        const ist = new Date(now.getTime()+(5.5*60*60*1000));
        return { date: ist.toISOString().split("T")[0], time: ist.toISOString().slice(11,16)+" IST" };
      };
      const ist = getIST();
      const stepsLocked = data.stepsWeekLocked?.[thisWeekKey] || false;
      const hasTarget = !!(weekTargets[thisWeekKey]?.stepper);

      // Get the 6 battle days of this week
      const battleDates = getDayDates(0).slice(0,6);
      const dayNames = ["Mon","Tue","Wed","Thu","Fri","Sat"];

      // Personal best
      const allWeekKeys = Object.keys(data.weeklyStepTargets||{});
      const personalBestStepper = allWeekKeys.length > 0
        ? Math.max(...allWeekKeys.map(wk => getDayDates(0).reduce((s,d)=>{
            // approximate — just check all stepper logs
            return s;
          },0)), stepperWeekTotal)
        : stepperWeekTotal;

      // Week comparison logic
      const thisWeekStepperTotal = stepperWeekTotal;
      const thisWeekWalkTotal = walkWeekTotal;
      const lastWeekStepperTotal = getWeekTotal(data.stepperLog, 1);
      const lastWeekWalkTotal = getWeekTotal(data.walkLog, 1);

      const getArrow = (curr, prev) => {
        if(prev === 0) return { icon:"➡️", label:"First week!", color:C.muted };
        const diff = curr - prev;
        const pct = Math.abs(Math.round((diff/prev)*100));
        if(diff > 0) return { icon:"⬆️", label:`+${diff.toLocaleString()} more than last week (+${pct}%)`, color:C.green };
        if(diff < 0) return { icon:"⬇️", label:`${diff.toLocaleString()} less than last week (-${pct}%)`, color:C.red };
        return { icon:"➡️", label:"Same as last week", color:C.muted };
      };

      const stepperArrow = getArrow(thisWeekStepperTotal, lastWeekStepperTotal);
      const walkArrow = getArrow(thisWeekWalkTotal, lastWeekWalkTotal);

      const lockTarget = () => {
        if(!ts||!tw) return;
        save({
          weeklyStepTargets:{...weekTargets,[thisWeekKey]:{stepper:parseInt(ts)||0,walking:parseInt(tw)||0,weekLabel:weekLabel||`Week of ${ist.date}`,lockedAt:`${ist.date} ${ist.time}`}},
          stepsWeekLocked:{...data.stepsWeekLocked,[thisWeekKey]:true}
        });
        setSetupMode(false);
      };

      if(setupMode||!hasTarget) return (
        <div>
          <div style={{...card,border:`1px solid ${C.goldDim}`,background:"#0a0800"}}>
            <div style={{fontSize:10,color:C.gold,letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>🎯 Set Weekly Step Targets</div>
            <div style={{fontSize:11,color:C.muted,marginBottom:8,lineHeight:1.6}}>Name your week and set targets. Once locked — <span style={{color:C.red,fontWeight:700}}>no changes allowed</span>.</div>
            <div style={{fontSize:11,color:"#818cf8",marginBottom:12}}>🕐 Kolkata time: {ist.time} · {ist.date}</div>
            <div style={{marginBottom:10}}>
              <div style={{fontSize:10,color:C.muted,marginBottom:5}}>Week name (your choice)</div>
              <input style={inp} placeholder='e.g. "Week 1 — Foundation"' value={weekLabel} onChange={e=>setWeekLabel(e.target.value)}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
              <div><div style={{fontSize:10,color:C.muted,marginBottom:5}}>🏃 Stepper (weekly total)</div><input style={inp} type="number" placeholder="e.g. 4200" value={ts} onChange={e=>setTs(e.target.value)}/></div>
              <div><div style={{fontSize:10,color:C.muted,marginBottom:5}}>👟 Walking (weekly total)</div><input style={inp} type="number" placeholder="e.g. 7000" value={tw} onChange={e=>setTw(e.target.value)}/></div>
            </div>
            <button style={{...btn("danger"),width:"100%",fontSize:13,padding:"13px"}} onClick={lockTarget}>🔒 Lock — Cannot Be Changed</button>
            {hasTarget&&<button style={{...btn("ghost"),width:"100%",marginTop:8,fontSize:11}} onClick={()=>setSetupMode(false)}>← Back</button>}
          </div>
        </div>
      );

      return (
        <div>
          {/* Week header */}
          <div style={{...card,border:`1px solid ${stepsLocked?C.red+"55":C.goldDim}`,background:stepsLocked?"#0d0000":"#0a0800"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
              <div>
                <div style={{fontSize:10,color:stepsLocked?C.red:C.gold,letterSpacing:2,textTransform:"uppercase"}}>{stepsLocked?"🔒 TARGETS LOCKED":"🎯 Active"}</div>
                <div style={{fontSize:15,fontWeight:700,marginTop:3}}>{weekTargets[thisWeekKey]?.weekLabel||thisWeekKey}</div>
                {weekTargets[thisWeekKey]?.lockedAt&&<div style={{fontSize:9,color:C.muted,marginTop:2}}>Locked {weekTargets[thisWeekKey].lockedAt}</div>}
              </div>
              {!stepsLocked&&<button style={{...btn("ghost"),fontSize:10,padding:"4px 10px"}} onClick={()=>setSetupMode(true)}>✏️ Edit</button>}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div style={{background:"#111",borderRadius:8,padding:10}}><div style={{fontSize:9,color:C.muted}}>🏃 Stepper target</div><div style={{fontSize:20,fontWeight:800,color:C.gold}}>{thisTarget.stepper.toLocaleString()}</div>{lastWeekStepperTotal>0&&<div style={{fontSize:9,color:C.muted,marginTop:2}}>Last week: {lastWeekStepperTotal.toLocaleString()}</div>}</div>
              <div style={{background:"#111",borderRadius:8,padding:10}}><div style={{fontSize:9,color:C.muted}}>👟 Walking target</div><div style={{fontSize:20,fontWeight:800,color:C.green}}>{thisTarget.walking.toLocaleString()}</div>{lastWeekWalkTotal>0&&<div style={{fontSize:9,color:C.muted,marginTop:2}}>Last week: {lastWeekWalkTotal.toLocaleString()}</div>}</div>
            </div>
          </div>

          {/* Log today */}
          <div style={card}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div style={{fontSize:13,fontWeight:700}}>Log Today → +30 XP</div>
              <div style={{fontSize:10,color:"#818cf8"}}>{ist.time}</div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
              <div><div style={{fontSize:10,color:C.muted,marginBottom:5}}>🏃 STEPPER</div><input style={inp} type="number" placeholder="steps" value={si} onChange={e=>setSi(e.target.value)}/></div>
              <div><div style={{fontSize:10,color:C.muted,marginBottom:5}}>👟 WALKING</div><input style={inp} type="number" placeholder="steps" value={wi} onChange={e=>setWi(e.target.value)}/></div>
            </div>
            <button style={{...btn(),width:"100%"}} onClick={()=>{
              const sv=parseInt(si)||0,wv=parseInt(wi)||0;
              const ns=todayStepper+sv,nw=todayWalk+wv;
              if(sv>0) save({stepperLog:{...data.stepperLog,[today]:ns}});
              if(wv>0) save({walkLog:{...data.walkLog,[today]:nw}});
              if(sv>0){grantXP(30,"agility");completeQuest("stepper");}
              const bi=[];
              if(ns>thisTarget.stepper) bi.push({type:"stepper",val:ns,target:thisTarget.stepper,bonus:50});
              if(nw>thisTarget.walking) bi.push({type:"walking",val:nw,target:thisTarget.walking,bonus:30});
              if(bi.length>0){save({bonusLog:{...bonusLog,[today]:[...todayBonus,...bi]}});bi.forEach(b=>grantXP(b.bonus,"agility"));}
              setSi("");setWi("");
            }}>Log Steps ✓</button>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:12}}>
              <div style={{background:"#111",borderRadius:8,padding:10}}><div style={{fontSize:10,color:C.muted}}>Today Stepper</div><div style={{fontSize:22,fontWeight:800,color:C.gold}}>{todayStepper.toLocaleString()}</div></div>
              <div style={{background:"#111",borderRadius:8,padding:10}}><div style={{fontSize:10,color:C.muted}}>Today Walking</div><div style={{fontSize:22,fontWeight:800,color:C.green}}>{todayWalk.toLocaleString()}</div></div>
            </div>
          </div>

          {/* Daily log grid — 6 battle days */}
          <div style={card}>
            <div style={{fontSize:13,fontWeight:700,marginBottom:12}}>⚔️ This Week — Daily Log</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:6,marginBottom:8}}>
              {battleDates.map((date,i)=>{
                const s = data.stepperLog?.[date]||0;
                const w = data.walkLog?.[date]||0;
                const isToday = date===today;
                const hasData = s>0||w>0;
                const maxS = Math.max(...battleDates.map(d=>data.stepperLog?.[d]||0),1);
                return(
                  <div key={date} style={{background:isToday?"#1c1000":hasData?"#0f0f0f":"#0a0a0a",borderRadius:8,padding:"8px 6px",border:`1px solid ${isToday?C.gold:hasData?C.goldDim:C.border}`,textAlign:"center"}}>
                    <div style={{fontSize:9,color:isToday?C.gold:C.muted,fontWeight:isToday?700:400,marginBottom:4}}>{dayNames[i]}</div>
                    {hasData ? (
                      <>
                        <div style={{height:3,background:"#222",borderRadius:2,marginBottom:4,overflow:"hidden"}}>
                          <div style={{height:"100%",width:`${Math.min(100,(s/maxS)*100)}%`,background:C.gold,borderRadius:2}}/>
                        </div>
                        <div style={{fontSize:9,color:C.gold,fontWeight:700}}>{s>=1000?`${(s/1000).toFixed(1)}k`:s}</div>
                        <div style={{fontSize:8,color:C.muted}}>🏃</div>
                        {w>0&&<div style={{fontSize:8,color:C.green}}>{w>=1000?`${(w/1000).toFixed(1)}k`:w}👟</div>}
                      </>
                    ):(
                      <div style={{fontSize:9,color:"#333",marginTop:4}}>{isToday?"Log!":"—"}</div>
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{display:"flex",gap:8,fontSize:9,color:C.muted,justifyContent:"center"}}>
              <span style={{color:C.gold}}>■ Stepper</span>
              <span style={{color:C.green}}>■ Walking</span>
            </div>
          </div>

          {/* Weekly progression */}
          <div style={{...card,border:`1px solid ${C.goldDim}`}}>
            <div style={{fontSize:13,fontWeight:700,marginBottom:12}}>📈 Weekly Progression</div>
            {[
              {l:"🏃 Stepper",curr:thisWeekStepperTotal,prev:lastWeekStepperTotal,target:thisTarget.stepper,c:C.gold,arrow:stepperArrow},
              {l:"👟 Walking",curr:thisWeekWalkTotal,prev:lastWeekWalkTotal,target:thisTarget.walking,c:C.green,arrow:walkArrow}
            ].map(s=>(
              <div key={s.l} style={{marginBottom:16}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <span style={{fontSize:12,fontWeight:600}}>{s.l}</span>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <span style={{fontSize:16}}>{s.arrow.icon}</span>
                    <span style={{fontSize:11,color:s.arrow.color,fontWeight:700}}>{s.curr.toLocaleString()}</span>
                  </div>
                </div>
                <div style={{height:8,background:"#1a1a1a",borderRadius:4,overflow:"hidden",marginBottom:4}}>
                  <div style={{height:"100%",width:`${Math.min(100,s.target>0?(s.curr/s.target)*100:0).toFixed(1)}%`,background:s.c,borderRadius:4,transition:"width 0.8s"}}/>
                </div>
                <div style={{fontSize:10,color:s.arrow.color,marginBottom:2}}>{s.arrow.label}</div>
                <div style={{fontSize:9,color:C.muted}}>Target: {s.target.toLocaleString()} · {s.curr>=s.target?"⚡ SMASHED!":`${(s.target-s.curr).toLocaleString()} remaining`}</div>
              </div>
            ))}
          </div>

          {/* 4-week comparison chart */}
          <div style={card}>
            <div style={{fontSize:13,fontWeight:700,marginBottom:10}}>📊 4-Week Comparison</div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={last4} barCategoryGap="25%">
                <XAxis dataKey="week" tick={{fontSize:10,fill:C.muted}}/><YAxis tick={{fontSize:9,fill:C.muted}} width={36} tickFormatter={v=>v>=1000?`${(v/1000).toFixed(1)}k`:v}/>
                <Tooltip contentStyle={{background:"#1a1a1a",border:`1px solid ${C.border}`,borderRadius:8,fontSize:11}}/>
                <Bar dataKey="stepper" name="Stepper" fill={C.gold} radius={[3,3,0,0]}/><Bar dataKey="walking" name="Walking" fill={C.green} radius={[3,3,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
            <div style={{display:"flex",gap:16,justifyContent:"center",marginTop:6}}>
              <span style={{fontSize:10,color:C.gold}}>■ Stepper</span>
              <span style={{fontSize:10,color:C.green}}>■ Walking</span>
            </div>
          </div>
        </div>
      );
    };

    // ── TRAIN ──
    const TrainSection = () => {
      const [localLog,setLocalLog] = useState(todayExLog);
      const [bonusEntry,setBonusEntry] = useState({});
      const [setupMode,setSetupMode] = useState(false);
      const [trainWeekLabel,setTrainWeekLabel] = useState("");

      const getIST = () => {
        const now = new Date();
        const ist = new Date(now.getTime()+(5.5*60*60*1000));
        return { date: ist.toISOString().split("T")[0], time: ist.toISOString().slice(11,16)+" IST" };
      };
      const ist = getIST();

      // Auto week number: count how many train plans exist before this one
      const allPlanKeys = Object.keys(data.weeklyTrainPlan||{}).sort();
      const autoWeekNum = allPlanKeys.indexOf(thisWeekKey) >= 0
        ? allPlanKeys.indexOf(thisWeekKey) + 1
        : allPlanKeys.length + 1;

      // Default date range: today to today+6
      const defaultFrom = ist.date;
      const defaultTo = (() => { const d=new Date(ist.date); d.setDate(d.getDate()+6); return d.toISOString().split("T")[0]; })();

      const thisPlan = data.weeklyTrainPlan?.[thisWeekKey] || [];
      const isLocked = data.trainPlanLocked?.[thisWeekKey] || false;
      const firstLogExists = getDayDates(0).some(d => data.exerciseLog?.[d] && Object.keys(data.exerciseLog[d]).length > 0);
      const planEffectivelyLocked = isLocked || firstLogExists;

      const existingMeta = data.trainPlanMeta?.[thisWeekKey];
      const [dateFrom,setDateFrom] = useState(existingMeta?.dateFrom||defaultFrom);
      const [dateTo,setDateTo]     = useState(existingMeta?.dateTo||defaultTo);

      const [dayPlans, setDayPlans] = useState(() => {
        if(thisPlan.length>0) return thisPlan;
        return Array.from({length:7},(_,i)=>({
          day:["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][i],
          type:["upper","recovery","lower","recovery","full","stepper","rest"][i],
          exercises:[{name:"",equip:"",sets:"",reps:"",note:""}]
        }));
      });

      const addExercise = (dayIdx) => {
        const updated = [...dayPlans];
        updated[dayIdx] = {...updated[dayIdx], exercises:[...updated[dayIdx].exercises,{name:"",equip:"",sets:"",reps:"",note:""}]};
        setDayPlans(updated);
      };
      const updateEx = (dayIdx,exIdx,field,val) => {
        const updated = [...dayPlans];
        updated[dayIdx].exercises[exIdx] = {...updated[dayIdx].exercises[exIdx],[field]:val};
        setDayPlans(updated);
      };
      const savePlan = () => {
        const autoLabel = `Week ${autoWeekNum} · ${dateFrom} → ${dateTo}`;
        save({
          weeklyTrainPlan:{...data.weeklyTrainPlan,[thisWeekKey]:dayPlans},
          trainPlanLocked:{...data.trainPlanLocked,[thisWeekKey]:true},
          trainPlanMeta:{...data.trainPlanMeta,[thisWeekKey]:{
            label: trainWeekLabel || autoLabel,
            weekNum: autoWeekNum,
            dateFrom, dateTo,
            lockedAt:`${ist.date} ${ist.time}`
          }}
        });
        setSetupMode(false);
      };

      // Get today's plan
      const todayDayIdx = dayOfWeek===0?6:dayOfWeek-1; // Mon=0
      const todayPlanDay = thisPlan[todayDayIdx] || null;
      const todayExercises = todayPlanDay?.exercises?.filter(e=>e.name.trim()) || [];

      if(setupMode || (!planEffectivelyLocked && thisPlan.length===0)) return (
        <div>
          <div style={{...card,border:`1px solid #6366f144`,background:"#0a0814"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
              <div>
                <div style={{fontSize:10,color:"#818cf8",letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>📋 Battle Plan Setup</div>
                <div style={{fontSize:22,fontWeight:900,color:"#818cf8"}}>Week {autoWeekNum}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:10,color:"#818cf8"}}>🕐 {ist.time}</div>
                <div style={{fontSize:10,color:C.muted,marginTop:2}}>{ist.date}</div>
              </div>
            </div>
            <div style={{fontSize:11,color:C.muted,marginBottom:12,lineHeight:1.6}}>Lock after entry — <span style={{color:C.red,fontWeight:700}}>no changes once first session is logged</span>.</div>

            {/* Date range */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
              <div>
                <div style={{fontSize:10,color:C.muted,marginBottom:5}}>📅 From date</div>
                <input style={{...inp,fontSize:12}} type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}/>
              </div>
              <div>
                <div style={{fontSize:10,color:C.muted,marginBottom:5}}>📅 To date</div>
                <input style={{...inp,fontSize:12}} type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)}/>
              </div>
            </div>

            {/* Optional custom label */}
            <div>
              <div style={{fontSize:10,color:C.muted,marginBottom:5}}>Custom name (optional — auto-fills if blank)</div>
              <input style={inp} placeholder={`Week ${autoWeekNum} · ${dateFrom} → ${dateTo}`} value={trainWeekLabel} onChange={e=>setTrainWeekLabel(e.target.value)}/>
            </div>
          </div>
          {dayPlans.map((day,di)=>(
            <div key={di} style={card}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <div style={{fontSize:13,fontWeight:700}}>{day.day}</div>
                <select style={{...inp,width:"auto",fontSize:11,padding:"4px 8px"}} value={day.type} onChange={e=>{const u=[...dayPlans];u[di]={...u[di],type:e.target.value};setDayPlans(u);}}>
                  {["upper","lower","full","recovery","stepper","rest"].map(t=><option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
                </select>
              </div>
              {day.type==="rest"||day.type==="recovery" ? (
                <div style={{fontSize:11,color:C.muted,fontStyle:"italic"}}>{day.type==="rest"?"Rest day — no exercises":"Recovery day — yoga/stretching only"}</div>
              ) : (
                <>
                  {day.exercises.map((ex,ei)=>(
                    <div key={ei} style={{marginBottom:10,padding:10,background:"#111",borderRadius:8}}>
                      <input style={{...inp,marginBottom:6}} placeholder="Exercise name (e.g. Bicep Curls)" value={ex.name} onChange={e=>updateEx(di,ei,"name",e.target.value)}/>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:6}}>
                        <input style={{...inp,fontSize:11}} placeholder="Equipment" value={ex.equip} onChange={e=>updateEx(di,ei,"equip",e.target.value)}/>
                        <input style={{...inp,fontSize:11}} placeholder="Sets" type="number" value={ex.sets} onChange={e=>updateEx(di,ei,"sets",e.target.value)}/>
                        <input style={{...inp,fontSize:11}} placeholder="Reps" value={ex.reps} onChange={e=>updateEx(di,ei,"reps",e.target.value)}/>
                      </div>
                      <input style={{...inp,fontSize:11}} placeholder="Notes (optional)" value={ex.note} onChange={e=>updateEx(di,ei,"note",e.target.value)}/>
                    </div>
                  ))}
                  <button style={{...btn("ghost"),width:"100%",fontSize:11,padding:"7px"}} onClick={()=>addExercise(di)}>+ Add Exercise</button>
                </>
              )}
            </div>
          ))}
          <button style={{...btn(),width:"100%",fontSize:14,padding:"14px",marginBottom:20}} onClick={savePlan}>🔒 Lock This Week's Plan</button>
          {thisPlan.length>0&&<button style={{...btn("ghost"),width:"100%",fontSize:12,padding:"10px",marginBottom:20}} onClick={()=>setSetupMode(false)}>← Back</button>}
        </div>
      );

      if(thisPlan.length===0) return (
        <div style={{...card,textAlign:"center",padding:40}}>
          <div style={{fontSize:36}}>📋</div>
          <div style={{fontSize:15,fontWeight:700,marginTop:10}}>No Plan Set Yet</div>
          <div style={{fontSize:12,color:C.muted,marginTop:6,marginBottom:16}}>Set your battle plan before Sunday midnight</div>
          <button style={btn()} onClick={()=>setSetupMode(true)}>Set This Week's Plan →</button>
        </div>
      );

      return (
        <div>
          {/* Plan header */}
          <div style={{...card,border:`1px solid ${planEffectivelyLocked?C.red+"44":C.goldDim}`,background:planEffectivelyLocked?"#0d0000":"#0f0800"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div>
                <div style={{fontSize:10,color:planEffectivelyLocked?C.red:C.gold,letterSpacing:2,textTransform:"uppercase"}}>{planEffectivelyLocked?"🔒 LOCKED":"📋 Active Plan"}</div>
                <div style={{fontSize:22,fontWeight:900,color:planEffectivelyLocked?C.red:C.gold,marginTop:2}}>
                  Week {data.trainPlanMeta?.[thisWeekKey]?.weekNum||autoWeekNum}
                </div>
                {data.trainPlanMeta?.[thisWeekKey]?.dateFrom&&(
                  <div style={{fontSize:11,color:C.muted,marginTop:2}}>
                    📅 {data.trainPlanMeta[thisWeekKey].dateFrom} → {data.trainPlanMeta[thisWeekKey].dateTo}
                  </div>
                )}
                {data.trainPlanMeta?.[thisWeekKey]?.label&&<div style={{fontSize:11,color:C.muted,marginTop:2,fontStyle:"italic"}}>{data.trainPlanMeta[thisWeekKey].label}</div>}
                {data.trainPlanMeta?.[thisWeekKey]?.lockedAt&&<div style={{fontSize:9,color:C.muted,marginTop:3}}>Locked {data.trainPlanMeta[thisWeekKey].lockedAt}</div>}
                <div style={{fontSize:12,color:C.muted,marginTop:4}}>{todayPlanDay?.day} — {todayPlanDay?.type?.charAt(0).toUpperCase()+(todayPlanDay?.type?.slice(1)||"")}</div>
              </div>
              {!planEffectivelyLocked&&<button style={{...btn("ghost"),fontSize:10,padding:"5px 10px"}} onClick={()=>setSetupMode(true)}>✏️ Edit</button>}
            </div>
          </div>

          {todayPlanDay?.type==="rest" ? (
            <div style={{...card,textAlign:"center",padding:40}}><div style={{fontSize:48}}>🛌</div><div style={{fontSize:18,fontWeight:700,marginTop:12}}>Rest Day</div><div style={{fontSize:13,color:C.muted,marginTop:8}}>Warriors who rest, last.</div></div>
          ) : (
            <>
              <div style={{display:"flex",gap:8,marginBottom:12}}>
                {[["plan","📋 Plan"],["log","✅ Log Actual"]].map(([id,label])=>(
                  <button key={id} onClick={()=>setExView(id)} style={{flex:1,padding:"10px",borderRadius:8,border:`1px solid ${exView===id?C.gold:C.border}`,background:exView===id?C.goldDim:"#1a1a1a",color:exView===id?C.goldLight:C.muted,fontWeight:exView===id?700:400,fontSize:13,cursor:"pointer"}}>{label}</button>
                ))}
              </div>
              {exView==="plan" ? (
                <div style={card}>
                  <div style={{fontSize:11,color:C.red,marginBottom:12,fontWeight:600}}>⚔️ CHALLENGE MODE — Beat these targets</div>
                  {todayExercises.length===0 ? (
                    <div style={{fontSize:12,color:C.muted,textAlign:"center",padding:20}}>No exercises set for today. Edit next week's plan!</div>
                  ) : todayExercises.map((ex,i)=>(
                    <div key={i} style={{padding:"14px 0",borderBottom:i<todayExercises.length-1?`1px solid ${C.border}`:"none"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                        <div style={{flex:1,paddingRight:12}}>
                          <div style={{fontSize:14,fontWeight:700}}>{ex.name}</div>
                          <div style={{fontSize:11,color:C.gold,marginTop:3}}>{ex.equip}</div>
                          {ex.note&&<div style={{fontSize:11,color:"#818cf8",marginTop:4,lineHeight:1.5}}>📌 {ex.note}</div>}
                        </div>
                        <div style={{textAlign:"right",flexShrink:0}}>
                          <div style={{fontSize:15,fontWeight:800,color:C.gold}}>{ex.sets}×{ex.reps}</div>
                          <div style={{fontSize:9,color:C.muted,marginTop:2}}>sets×reps</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={card}>
                  <div style={{fontSize:12,color:C.muted,marginBottom:12}}>Log what you actually did. Extra reps → Bonus XP!</div>
                  {todayExercises.map((ex,i)=>(
                    <div key={i} style={{padding:"12px 0",borderBottom:i<todayExercises.length-1?`1px solid ${C.border}`:"none"}}>
                      <div style={{fontSize:13,fontWeight:700,marginBottom:8}}>{ex.name} <span style={{fontSize:10,color:C.gold}}>({ex.equip})</span></div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
                        <div><div style={{fontSize:9,color:C.muted,marginBottom:4}}>Sets done</div><input style={{...inp,fontSize:12}} type="number" placeholder={`${ex.sets}`} value={localLog[`${i}-sets`]||""} onChange={e=>setLocalLog(l=>({...l,[`${i}-sets`]:e.target.value}))}/></div>
                        <div><div style={{fontSize:9,color:C.muted,marginBottom:4}}>Reps done</div><input style={{...inp,fontSize:12}} type="number" placeholder={`${ex.reps}`} value={localLog[`${i}-reps`]||""} onChange={e=>setLocalLog(l=>({...l,[`${i}-reps`]:e.target.value}))}/></div>
                        <div><div style={{fontSize:9,color:C.gold,marginBottom:4}}>⚡ Bonus reps</div><input style={{...inp,fontSize:12,border:`1px solid ${C.goldDim}`}} type="number" placeholder="0" value={bonusEntry[`${i}`]||""} onChange={e=>setBonusEntry(b=>({...b,[`${i}`]:e.target.value}))}/></div>
                      </div>
                    </div>
                  ))}
                  <button style={{...btn(),width:"100%",marginTop:14}} onClick={()=>{
                    save({exerciseLog:{...data.exerciseLog,[today]:localLog}});
                    completeQuest("workout");
                    grantXP(50,"strength");
                    const newBonus = [...(data.bonusLog?.[today]||[])];
                    let bonusXP = 0;
                    todayExercises.forEach((ex,i)=>{
                      const extra = parseInt(bonusEntry[`${i}`])||0;
                      if(extra>0){ newBonus.push({type:"reps",exercise:ex.name,extra,bonus:extra*2}); bonusXP+=extra*2; }
                    });
                    if(bonusXP>0){ save({bonusLog:{...data.bonusLog,[today]:newBonus}}); grantXP(bonusXP,"strength"); }
                  }}>Save Battle Log → +50 XP ⚔️</button>
                </div>
              )}
            </>
          )}
          {/* Weekly overview */}
          <div style={card}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div style={{fontSize:13,fontWeight:700}}>Week {data.trainPlanMeta?.[thisWeekKey]?.weekNum||autoWeekNum} Schedule</div>
              {data.trainPlanMeta?.[thisWeekKey]?.dateFrom&&<div style={{fontSize:10,color:C.muted}}>{data.trainPlanMeta[thisWeekKey].dateFrom} → {data.trainPlanMeta[thisWeekKey].dateTo}</div>}
            </div>
            {thisPlan.map((day,i)=>(
              <div key={i} style={{display:"flex",gap:10,alignItems:"center",padding:"7px 0",borderBottom:i<thisPlan.length-1?`1px solid ${C.border}`:"none"}}>
                <div style={{width:30,fontSize:11,fontWeight:i===todayDayIdx?700:400,color:i===todayDayIdx?C.gold:C.muted}}>{day.day}</div>
                <div style={{flex:1,fontSize:12,color:i===todayDayIdx?C.text:C.muted}}>{day.type==="rest"?"🛌 Rest":day.type==="recovery"?"🧘 Recovery":`⚔️ ${day.exercises?.filter(e=>e.name).length||0} exercises`}</div>
                {data.exerciseLog?.[getDayDates(0)[i]]&&<span style={{fontSize:10,color:C.green}}>✓ done</span>}
              </div>
            ))}
          </div>
        </div>
      );
    };

    // ── SKILL BUILDER (manual + AI plan) ──
    const SkillSection = () => {
      const [setupMode, setSetupMode] = useState(!isThisWeek);
      const [skillName, setSkillName] = useState(manualSkill.name||"");
      const [stepsText, setStepsText] = useState((manualSkill.steps||[]).join("\n"));
      const [howText,   setHowText]   = useState(manualSkill.how||"");
      const [generating,setGenerating]= useState(false);
      const [attempt,   setAttempt]   = useState("");

      const generateWeekPlan = async () => {
        if(!skillName.trim()||!stepsText.trim()) return;
        setGenerating(true);
        const steps = stepsText.split("\n").filter(s=>s.trim());
        try {
          const res = await fetch("https://api.anthropic.com/v1/messages",{
            method:"POST",headers:{"Content-Type":"application/json"},
            body:JSON.stringify({
              model:"claude-sonnet-4-20250514",max_tokens:500,
              messages:[{role:"user",content:`I am learning: ${skillName}
Steps I've defined: ${steps.map((s,i)=>`${i+1}. ${s}`).join(", ")}
How to do it: ${howText}
Current ability: ${manualSkill.currentStepIndex>=0?steps[manualSkill.currentStepIndex]||steps[0]:steps[0]}

Create a 7-day weekly practice plan (Mon to Sun). For each day give ONE specific daily practice target — what to attempt and how much. Make it progressive, building across the week. Format as exactly 7 lines: Mon: [instruction] | Tue: [instruction] | ... Keep each instruction under 12 words. Be specific with numbers.`}]
            })
          });
          const d = await res.json();
          const text = d.content[0]?.text||"";
          const days = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
          const planLines = text.split("|").map(l=>l.trim());
          const weekPlan = {};
          const planDates = getDayDates(0);
          planDates.forEach((date,i)=>{
            const line = planLines[i]||planLines[planLines.length-1]||"Practice skill";
            weekPlan[date] = line.replace(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun):\s*/i,"");
          });
          const newSkill = { name:skillName, steps, how:howText, weekKey:thisWeekKey, weekPlan, dailyLogs:manualSkill.dailyLogs||{}, completedSteps:manualSkill.completedSteps||[], currentStepIndex:manualSkill.currentStepIndex||0, mastered:false };
          save({manualSkill:newSkill});
          setSetupMode(false);
        } catch { setGenerating(false); }
        setGenerating(false);
      };

      const logAttempt = () => {
        if(!attempt.trim()) return;
        const updated = {...manualSkill, dailyLogs:{...manualSkill.dailyLogs,[today]:attempt}};
        save({manualSkill:updated});
        setAttempt("");
      };

      const completeStep = (stepIdx) => {
        const completed = [...new Set([...(manualSkill.completedSteps||[]),stepIdx])];
        const nextIdx   = stepIdx+1;
        const isLast    = nextIdx >= (manualSkill.steps||[]).length;
        const updated   = {...manualSkill, completedSteps:completed, currentStepIndex:isLast?stepIdx:nextIdx, mastered:isLast};
        save({manualSkill:updated});
        grantXP(isLast?300:75,"strength");
        if(isLast) save({winnersBoard:[...new Set([...data.winnersBoard,"custom_"+manualSkill.name.replace(/\s+/g,"_")])]});
      };

      const last7 = Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-6+i);const ds=d.toISOString().split("T")[0];return{day:["Su","Mo","Tu","We","Th","Fr","Sa"][d.getDay()],logged:!!(manualSkill.dailyLogs?.[ds])};});

      if(setupMode) return (
        <div>
          <div style={{...card,border:`1px solid #6366f144`}}>
            <div style={{fontSize:10,color:"#818cf8",letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>📖 Set Up This Week's Skill</div>
            <div style={{fontSize:11,color:C.muted,marginBottom:16,lineHeight:1.6}}>Enter your skill, the steps to learn it, and how to do it. The Oracle will build your 7-day practice plan.</div>
            <div style={{marginBottom:12}}>
              <div style={{fontSize:11,color:C.muted,marginBottom:5}}>Skill name</div>
              <input style={inp} placeholder="e.g. Headstand, Pull-up, Pistol Squat..." value={skillName} onChange={e=>setSkillName(e.target.value)}/>
            </div>
            <div style={{marginBottom:12}}>
              <div style={{fontSize:11,color:C.muted,marginBottom:5}}>Steps to learn it (one per line)</div>
              <textarea style={{...inp,minHeight:100,resize:"vertical",lineHeight:1.6}} placeholder={"e.g.:\nWall headstand hold 10s\nTripod headstand 15s\nFull headstand 20s\nFull headstand 30s"} value={stepsText} onChange={e=>setStepsText(e.target.value)}/>
            </div>
            <div style={{marginBottom:16}}>
              <div style={{fontSize:11,color:C.muted,marginBottom:5}}>How to do it (brief technique notes)</div>
              <textarea style={{...inp,minHeight:60,resize:"vertical",lineHeight:1.6}} placeholder="e.g. Core tight, gaze between hands, push floor away..." value={howText} onChange={e=>setHowText(e.target.value)}/>
            </div>
            <button style={{...btn("purple"),width:"100%",fontSize:13}} onClick={generateWeekPlan} disabled={generating}>
              {generating?"🔮 Oracle is building your plan...":"🔮 Generate Week Plan →"}
            </button>
          </div>
          {manualSkill.name&&!setupMode&&(
            <button style={{...btn("ghost"),width:"100%",marginTop:8}} onClick={()=>setSetupMode(false)}>← Back to current skill</button>
          )}
        </div>
      );

      return (
        <div>
          {/* Current skill header */}
          <div style={{...card,border:`1px solid ${C.goldDim}`,background:"#0f0800"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div>
                <div style={{fontSize:10,color:C.gold,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>This Week's Skill</div>
                <div style={{fontSize:20,fontWeight:800}}>{manualSkill.name||"No skill set"}</div>
                {manualSkill.mastered&&<div style={{fontSize:12,color:C.green,marginTop:4}}>🎖️ MASTERED!</div>}
              </div>
              <button style={{...btn("ghost"),fontSize:10,padding:"5px 10px"}} onClick={()=>setSetupMode(true)}>New Week ✏️</button>
            </div>
          </div>

          {/* Steps progress */}
          {(manualSkill.steps||[]).length>0&&(
            <div style={card}>
              <div style={{fontSize:13,fontWeight:700,marginBottom:10}}>Skill Progression</div>
              {manualSkill.steps.map((step,i)=>{
                const done = (manualSkill.completedSteps||[]).includes(i);
                const active = manualSkill.currentStepIndex===i;
                return (
                  <div key={i} style={{display:"flex",gap:10,alignItems:"center",padding:"10px 0",borderBottom:i<manualSkill.steps.length-1?`1px solid ${C.border}`:"none",opacity:done?0.5:1}}>
                    <div style={{width:26,height:26,borderRadius:"50%",background:done?C.green:active?C.goldDim:"#111",border:`1px solid ${done?C.green:active?C.gold:"#333"}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:11,fontWeight:700,color:done?"#fff":active?C.gold:C.muted}}>
                      {done?"✓":i+1}
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:active?700:400,color:active?C.text:C.muted}}>{step}</div>
                      {active&&<div style={{fontSize:10,color:C.gold,marginTop:2}}>← Working on this now</div>}
                    </div>
                    {active&&!done&&(
                      <button style={{...btn("success"),fontSize:10,padding:"5px 10px"}} onClick={()=>completeStep(i)}>Done ✓</button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Today's Oracle plan */}
          {todayPlan&&(
            <div style={{...card,border:`1px solid #6366f144`,background:"#0a0814"}}>
              <div style={{fontSize:10,color:"#818cf8",letterSpacing:2,textTransform:"uppercase",marginBottom:6}}>🔮 Oracle's Plan for Today</div>
              <div style={{fontSize:15,fontWeight:700,color:C.text,lineHeight:1.6}}>{todayPlan}</div>
              {manualSkill.how&&<div style={{fontSize:11,color:C.muted,marginTop:8,lineHeight:1.5}}>📌 Technique: {manualSkill.how}</div>}
            </div>
          )}

          {/* Daily log */}
          <div style={card}>
            <div style={{fontSize:13,fontWeight:700,marginBottom:8}}>Log Today's Practice</div>
            <div style={{display:"flex",gap:8,marginBottom:10}}>
              <input style={{...inp,flex:1}} placeholder="What did you do? e.g. 15s wall headstand × 3" value={attempt} onChange={e=>setAttempt(e.target.value)} onKeyDown={e=>e.key==="Enter"&&logAttempt()}/>
              <button style={btn()} onClick={logAttempt}>Log</button>
            </div>
            {manualSkill.dailyLogs?.[today]&&<div style={{fontSize:12,color:C.green}}>✓ Today: {manualSkill.dailyLogs[today]}</div>}
          </div>

          {/* 7-day tracker */}
          <div style={card}>
            <div style={{fontSize:13,fontWeight:700,marginBottom:10}}>This Week</div>
            <div style={{display:"flex",gap:8,justifyContent:"center"}}>
              {last7.map((d,i)=>(
                <div key={i} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                  <div style={{width:32,height:32,borderRadius:8,background:d.logged?C.gold:"#111",border:`1px solid ${d.logged?C.gold:C.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:d.logged?14:10,color:d.logged?"#000":C.muted}}>{d.logged?"✓":"–"}</div>
                  <span style={{fontSize:9,color:C.muted}}>{d.day}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Winners board */}
          {data.winnersBoard.filter(w=>w.startsWith("custom_")).length>0&&(
            <div style={{...card,border:`1px solid ${C.green}44`}}>
              <div style={{fontSize:13,fontWeight:700,color:C.green,marginBottom:8}}>🏆 Mastered Skills</div>
              {data.winnersBoard.filter(w=>w.startsWith("custom_")).map(w=>(
                <div key={w} style={{fontSize:13,padding:"6px 0",borderBottom:`1px solid ${C.border}`}}>⚔️ {w.replace("custom_","").replace(/_/g," ")}</div>
              ))}
            </div>
          )}
        </div>
      );
    };

    // ── BONUS BOARD ──
    const BonusSection = () => {
      const allBonus = Object.entries(data.bonusLog||{}).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,14);
      const totalBonusXP = Object.values(data.bonusLog||{}).flat().reduce((s,b)=>s+(b.bonus||0),0);
      return (
        <div>
          <div style={{...card,background:"linear-gradient(135deg,#1a0a00,#0f0f0f)",border:`1px solid ${C.goldDim}`}}>
            <div style={{fontSize:10,color:C.gold,letterSpacing:3,textTransform:"uppercase",marginBottom:6}}>⚡ GLORY BOARD</div>
            <div style={{fontSize:28,fontWeight:900,color:C.gold}}>{totalBonusXP.toLocaleString()} <span style={{fontSize:14,fontWeight:400,color:C.muted}}>bonus XP earned</span></div>
            <div style={{fontSize:12,color:C.muted,marginTop:4}}>Every time you beat a target — this is where it lives.</div>
          </div>

          <div style={card}>
            <div style={{fontSize:13,fontWeight:700,marginBottom:4}}>How Bonus XP Works</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:10}}>
              {[
                {icon:"⚡",label:"Extra reps",xp:"+2 XP per rep"},
                {icon:"🏃",label:"Beat stepper target",xp:"+50 XP"},
                {icon:"👟",label:"Beat walk target",xp:"+30 XP"},
                {icon:"📈",label:"Beat last week's total",xp:"+100 XP Sunday"},
              ].map((r,i)=>(
                <div key={i} style={{background:"#0f0f0f",borderRadius:8,padding:"10px 12px"}}>
                  <div style={{fontSize:18}}>{r.icon}</div>
                  <div style={{fontSize:11,fontWeight:600,marginTop:4}}>{r.label}</div>
                  <div style={{fontSize:10,color:C.gold,marginTop:2}}>{r.xp}</div>
                </div>
              ))}
            </div>
          </div>

          {allBonus.length===0&&(
            <div style={{...card,textAlign:"center",padding:40}}>
              <div style={{fontSize:36}}>⚡</div>
              <div style={{fontSize:15,fontWeight:700,marginTop:10}}>No Bonus Earned Yet</div>
              <div style={{fontSize:12,color:C.muted,marginTop:6}}>Beat your step targets or do extra reps to earn bonus XP here.</div>
            </div>
          )}

          {allBonus.map(([date,bonuses])=>(
            <div key={date} style={card}>
              <div style={{fontSize:11,color:C.gold,fontWeight:700,marginBottom:8}}>{date}</div>
              {bonuses.map((b,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:i<bonuses.length-1?`1px solid ${C.border}`:"none"}}>
                  <div>
                    {b.type==="reps"&&<div style={{fontSize:13}}>⚔️ {b.exercise} <span style={{color:C.green}}>+{b.extra} extra reps</span></div>}
                    {b.type==="stepper"&&<div style={{fontSize:13}}>🏃 Stepper target beaten! <span style={{color:C.green}}>{b.val.toLocaleString()} / {b.target.toLocaleString()}</span></div>}
                    {b.type==="walking"&&<div style={{fontSize:13}}>👟 Walking target beaten! <span style={{color:C.green}}>{b.val.toLocaleString()} / {b.target.toLocaleString()}</span></div>}
                  </div>
                  <div style={{fontSize:13,fontWeight:800,color:C.gold}}>+{b.bonus} XP</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      );
    };

    return (
      <div style={{padding:"16px 16px 0"}}>
        <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:12}}>
          {wBtn("steps","👟 Steps")}
          {wBtn("train","⚔️ Train")}
          {wBtn("skill","🎯 Skill")}
          {wBtn("bonus","⚡ Bonus")}
        </div>
        {wTab==="steps" && <StepsSection/>}
        {wTab==="train" && <TrainSection/>}
        {wTab==="skill" && <SkillSection/>}
        {wTab==="bonus" && <BonusSection/>}
      </div>
    );
  };

  // ═══════════════════════════════════
  // MIND TAB
  // ═══════════════════════════════════
  const MindTab = () => {
    const [newHabit,setNewHabit] = useState("");
    const [medMin,setMedMin] = useState("");
    const todayJournal = data.journal[today]||"";
    const todayMood    = data.mood[today]??null;
    const todayStress  = data.stress[today]||5;
    const todayHabits  = data.habitLog[today]||[];
    const moods = ["😊","😌","😐","😔","😤","😰"];
    const moodL = ["Happy","Calm","Okay","Low","Angry","Anxious"];

    const getMondayKey = () => { const d=new Date(); d.setDate(d.getDate()-((dayOfWeek+6)%7)); return d.toISOString().split("T")[0]; };
    const weekKey = getMondayKey();
    const weekMedTarget = data.weeklyMeditationTarget?.[weekKey] || 0;
    const [editMedTarget,setEditMedTarget] = useState(false);
    const [medTargetInput,setMedTargetInput] = useState(String(weekMedTarget));

        const weekMedTotal = getDayDates().reduce((s,d)=>s+(data.meditationLog?.[d]||0),0);
    const todayMed = data.meditationLog?.[today]||0;

    const logMed = () => {
      const v = parseInt(medMin)||0;
      if(v<=0) return;
      const newTotal = todayMed + v;
      save({meditationLog:{...data.meditationLog,[today]:newTotal}});
      grantXP(v*2,"willpower"); // 2 XP per minute
      const bonus = weekMedTarget>0 && weekMedTotal+v > weekMedTarget;
      if(bonus){ grantXP(50,"willpower"); save({bonusLog:{...data.bonusLog,[today]:[...(data.bonusLog?.[today]||[]),{type:"meditation",val:weekMedTotal+v,target:weekMedTarget,bonus:50}]}}); }
      setMedMin("");
    };

    const last7Med = Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-6+i);const ds=d.toISOString().split("T")[0];return{day:["Su","Mo","Tu","We","Th","Fr","Sa"][d.getDay()],val:data.meditationLog?.[ds]||0};});

    return (
      <div style={{padding:"16px 16px 0"}}>
        <div style={card}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:12}}>How does Eiraya feel today?</div>
          <div style={{display:"flex",justifyContent:"space-around"}}>
            {moods.map((m,i)=>(
              <div key={i} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,cursor:"pointer"}} onClick={()=>save({mood:{...data.mood,[today]:i}})}>
                <span style={{fontSize:26,transition:"all 0.2s",transform:todayMood===i?"scale(1.3)":"scale(1)",filter:todayMood===i?"none":"grayscale(0.7) opacity(0.5)"}}>{m}</span>
                <span style={{fontSize:8,color:todayMood===i?C.gold:C.muted}}>{moodL[i]}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={card}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <span style={{fontSize:13,fontWeight:700}}>Willpower Drain</span>
            <span style={{fontSize:20,fontWeight:800,color:todayStress>7?C.red:todayStress>4?C.gold:C.green}}>{todayStress}<span style={{fontSize:11,color:C.muted}}>/10</span></span>
          </div>
          <input type="range" min="1" max="10" value={todayStress} style={{width:"100%",accentColor:C.gold}} onChange={e=>save({stress:{...data.stress,[today]:+e.target.value}})}/>
        </div>

        {/* Meditation */}
        <div style={{...card,border:`1px solid #6366f144`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div>
              <div style={{fontSize:13,fontWeight:700}}>🧘 Inner Sanctum</div>
              <div style={{fontSize:10,color:C.muted,marginTop:2}}>Meditation · +2 XP per minute</div>
            </div>
            <button style={{...btn("ghost"),fontSize:10,padding:"4px 10px"}} onClick={()=>setEditMedTarget(e=>!e)}>{editMedTarget?"Save":"Set Weekly"}</button>
          </div>
          {editMedTarget&&(
            <div style={{marginBottom:10}}>
              <div style={{fontSize:10,color:C.muted,marginBottom:5}}>Weekly target (minutes)</div>
              <input style={{...inp}} type="number" placeholder="e.g. 70" value={medTargetInput}
                onChange={e=>setMedTargetInput(e.target.value)}
                onBlur={()=>{ save({weeklyMeditationTarget:{...data.weeklyMeditationTarget,[weekKey]:parseInt(medTargetInput)||0}}); setEditMedTarget(false); }}/>
            </div>
          )}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:12}}>
            <div style={{background:"#111",borderRadius:8,padding:10,textAlign:"center"}}>
              <div style={{fontSize:9,color:C.muted}}>Today</div>
              <div style={{fontSize:20,fontWeight:800,color:"#818cf8"}}>{todayMed}<span style={{fontSize:10,fontWeight:400}}> min</span></div>
            </div>
            <div style={{background:"#111",borderRadius:8,padding:10,textAlign:"center"}}>
              <div style={{fontSize:9,color:C.muted}}>This Week</div>
              <div style={{fontSize:20,fontWeight:800,color:"#818cf8"}}>{weekMedTotal}<span style={{fontSize:10,fontWeight:400}}> min</span></div>
            </div>
            <div style={{background:"#111",borderRadius:8,padding:10,textAlign:"center"}}>
              <div style={{fontSize:9,color:C.muted}}>Target</div>
              <div style={{fontSize:20,fontWeight:800,color:weekMedTotal>=weekMedTarget&&weekMedTarget>0?C.green:C.muted}}>{weekMedTarget}<span style={{fontSize:10,fontWeight:400}}> min</span></div>
            </div>
          </div>
          {weekMedTarget>0&&(
            <div style={{marginBottom:12}}>
              <div style={{height:6,background:"#1a1a1a",borderRadius:3,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${Math.min(100,(weekMedTotal/weekMedTarget)*100).toFixed(1)}%`,background:"#818cf8",borderRadius:3,transition:"width 0.8s"}}/>
              </div>
              {weekMedTotal>weekMedTarget&&<div style={{fontSize:10,color:C.green,marginTop:4}}>⚡ Exceeded by {weekMedTotal-weekMedTarget} min! Bonus XP earned!</div>}
            </div>
          )}
          <div style={{display:"flex",gap:8}}>
            <input style={{...inp,flex:1}} type="number" placeholder="Minutes meditated today..." value={medMin} onChange={e=>setMedMin(e.target.value)} onKeyDown={e=>e.key==="Enter"&&logMed()}/>
            <button style={btn()} onClick={logMed}>+Log</button>
          </div>
          {last7Med.some(d=>d.val>0)&&(
            <div style={{marginTop:12}}>
              <div style={{fontSize:10,color:C.muted,marginBottom:8}}>Last 7 days</div>
              <div style={{display:"flex",gap:6,alignItems:"flex-end",height:40}}>
                {last7Med.map((d,i)=>{
                  const maxVal = Math.max(...last7Med.map(x=>x.val),1);
                  return (
                    <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                      <div style={{width:"100%",background:"#818cf8",borderRadius:"3px 3px 0 0",height:`${Math.max(4,(d.val/maxVal)*32)}px`,transition:"height 0.5s"}}/>
                      <span style={{fontSize:8,color:C.muted}}>{d.day}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div style={card}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:8}}>📜 War Journal → +15 XP</div>
          <textarea style={{...inp,minHeight:90,resize:"vertical",lineHeight:1.6}} placeholder="Write your truth. No one else reads this. What battles did you fight today?"
            value={todayJournal} onChange={e=>{ save({journal:{...data.journal,[today]:e.target.value}}); if(e.target.value.length>10){ completeQuest("journal"); grantXP(15,"willpower"); } }}/>
        </div>

        <div style={card}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:12}}>🛡️ Daily Habits → +25 XP when all done</div>
          {data.habits.map((h,i)=>{
            const done = todayHabits.includes(i);
            return (
              <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:`1px solid ${C.border}`,cursor:"pointer"}}>
                <div style={{width:22,height:22,borderRadius:5,background:done?C.gold:"#111",border:`1px solid ${done?C.gold:C.border}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all 0.2s"}}
                  onClick={()=>{
                    const curr=data.habitLog[today]||[];
                    const newH=curr.includes(i)?curr.filter(x=>x!==i):[...curr,i];
                    save({habitLog:{...data.habitLog,[today]:newH}});
                    if(data.habits.every((_,j)=>newH.includes(j))){ completeQuest("habits"); grantXP(25,"willpower"); }
                  }}>
                  {done&&<span style={{fontSize:12,color:"#000",fontWeight:800}}>✓</span>}
                </div>
                <span style={{flex:1,fontSize:13,color:done?C.muted:C.text,textDecoration:done?"line-through":"none",transition:"all 0.2s"}}>{h}</span>
                <button style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:16}} onClick={()=>save({habits:data.habits.filter((_,j)=>j!==i)})}>×</button>
              </div>
            );
          })}
          <div style={{display:"flex",gap:8,marginTop:10}}>
            <input style={{...inp,flex:1}} placeholder="Add habit..." value={newHabit} onChange={e=>setNewHabit(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&newHabit.trim()){save({habits:[...data.habits,newHabit.trim()]});setNewHabit("");}}}/>
            <button style={btn()} onClick={()=>{if(newHabit.trim()){save({habits:[...data.habits,newHabit.trim()]});setNewHabit("");}}}> +</button>
          </div>
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────
  // CALORIE CALCULATOR COMPONENT
  // ─────────────────────────────────────────
  const CalorieSection = () => {
    const [search, setSearch] = useState("");
    const [customName, setCustomName] = useState("");
    const [customCal, setCustomCal] = useState("");
    const [showCustom, setShowCustom] = useState(false);
    const [editingIdx, setEditingIdx] = useState(null);
    const [editCal, setEditCal] = useState("");

    const todayEntries = data.calorieEntries?.[today]?.foods || [];
    const totalCal = todayEntries.reduce((s,e)=>s+(e.cal||0),0);
    const target = data.calorieTarget || 1400;

    // Weekly comparison
    const getWeekDailyTotals = (offset=0) => {
      return getDayDates(offset).slice(0,6).map(date=>{
        const entries = data.calorieEntries?.[date]?.foods || [];
        return {date, total:entries.reduce((s,e)=>s+(e.cal||0),0)};
      });
    };
    const thisWeekTotals = getWeekDailyTotals(0);
    const lastWeekTotals = getWeekDailyTotals(1);
    const thisWeekAvg = Math.round(thisWeekTotals.reduce((s,d)=>s+d.total,0) / Math.max(1,thisWeekTotals.filter(d=>d.total>0).length));
    const lastWeekAvg = Math.round(lastWeekTotals.reduce((s,d)=>s+d.total,0) / Math.max(1,lastWeekTotals.filter(d=>d.total>0).length));

    // All foods = DB + custom
    const customFoods = Object.values(data.customFoods||{});
    const allFoods = [...FOOD_DB,...customFoods];
    const filtered = search.length>1 ? allFoods.filter(f=>f.name.toLowerCase().includes(search.toLowerCase())).slice(0,6) : [];

    const addFood = (food) => {
      const entry = {name:food.name,cal:food.cal,time:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})};
      const existing = data.calorieEntries?.[today] || {};
      const foods = [...(existing.foods||[]),entry];
      save({calorieEntries:{...data.calorieEntries,[today]:{...existing,foods}}});
      setSearch("");
    };

    const addCustomFood = () => {
      if(!customName.trim()||!customCal) return;
      const newFood = {name:customName.trim(),cal:parseInt(customCal)||0,cat:"⭐ My Foods"};
      const key = `custom_${Date.now()}`;
      save({customFoods:{...data.customFoods,[key]:newFood}});
      addFood(newFood);
      setCustomName("");setCustomCal("");setShowCustom(false);
    };

    const removeEntry = (idx) => {
      const existing = data.calorieEntries?.[today] || {};
      const foods = (existing.foods||[]).filter((_,i)=>i!==idx);
      save({calorieEntries:{...data.calorieEntries,[today]:{...existing,foods}}});
    };

    const saveEditCal = (idx) => {
      const existing = data.calorieEntries?.[today] || {};
      const foods = [...(existing.foods||[])];
      foods[idx] = {...foods[idx],cal:parseInt(editCal)||foods[idx].cal};
      save({calorieEntries:{...data.calorieEntries,[today]:{...existing,foods}}});
      setEditingIdx(null);setEditCal("");
    };

    const pct = Math.min(100,(totalCal/target)*100);
    const barColor = totalCal > target ? C.red : totalCal > target*0.85 ? C.gold : C.green;

    return(
      <div>
        {/* Daily total */}
        <div style={{...card,background:"linear-gradient(135deg,#0a1200,#131313)",border:`1px solid ${totalCal>target?C.red:C.green}`}}>
          <div style={{fontSize:10,color:totalCal>target?C.red:C.green,letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>🔥 Today's Calories</div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:10}}>
            <div>
              <div style={{fontSize:36,fontWeight:900,color:barColor,lineHeight:1}}>{totalCal.toLocaleString()}</div>
              <div style={{fontSize:11,color:C.muted,marginTop:4}}>of {target} kcal target</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:13,fontWeight:700,color:totalCal>target?C.red:C.muted}}>{totalCal>target?`+${(totalCal-target).toLocaleString()} over`:`${(target-totalCal).toLocaleString()} remaining`}</div>
            </div>
          </div>
          <div style={{height:8,background:"#1a1a1a",borderRadius:4,overflow:"hidden"}}><div style={{height:"100%",width:`${pct.toFixed(1)}%`,background:barColor,borderRadius:4,transition:"width 0.8s"}}/></div>
        </div>

        {/* Food search */}
        <div style={card}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:10}}>➕ Add Food</div>
          <input style={{...inp,marginBottom:8}} placeholder="Search food (e.g. dal, roti, apple...)" value={search} onChange={e=>setSearch(e.target.value)}/>
          {filtered.length>0&&(
            <div style={{background:"#111",borderRadius:8,overflow:"hidden",marginBottom:10}}>
              {filtered.map((f,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",borderBottom:i<filtered.length-1?`1px solid ${C.border}`:"none",cursor:"pointer"}}
                  onClick={()=>addFood(f)}>
                  <div>
                    <div style={{fontSize:13}}>{f.name}</div>
                    <div style={{fontSize:10,color:C.muted}}>{f.cat}</div>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:13,fontWeight:700,color:C.gold}}>{f.cal} kcal</span>
                    <span style={{fontSize:18,color:C.green}}>+</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {search.length>1&&filtered.length===0&&<div style={{fontSize:12,color:C.muted,marginBottom:8,padding:"8px 0"}}>Not found — add it as custom food below</div>}

          {/* Custom food toggle */}
          <button style={{...btn("ghost"),width:"100%",fontSize:12}} onClick={()=>setShowCustom(s=>!s)}>
            {showCustom?"✕ Cancel":"⭐ Add Custom Food"}
          </button>
          {showCustom&&(
            <div style={{marginTop:10,padding:12,background:"#111",borderRadius:8}}>
              <div style={{fontSize:11,color:C.muted,marginBottom:8}}>Add your own food to the database</div>
              <input style={{...inp,marginBottom:8}} placeholder="Food name (e.g. Mom's dal)" value={customName} onChange={e=>setCustomName(e.target.value)}/>
              <input style={{...inp,marginBottom:8}} type="number" placeholder="Calories (kcal per serving)" value={customCal} onChange={e=>setCustomCal(e.target.value)}/>
              <button style={{...btn(),width:"100%"}} onClick={addCustomFood}>Save & Add ✓</button>
            </div>
          )}
        </div>

        {/* Today's food log */}
        {todayEntries.length>0&&(
          <div style={card}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{fontSize:13,fontWeight:700}}>Today's Log</div>
              <div style={{fontSize:12,color:C.gold,fontWeight:700}}>{totalCal} kcal</div>
            </div>
            {todayEntries.map((e,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 0",borderBottom:i<todayEntries.length-1?`1px solid ${C.border}`:"none"}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:13}}>{e.name}</div>
                  <div style={{fontSize:10,color:C.muted}}>{e.time}</div>
                </div>
                {editingIdx===i?(
                  <div style={{display:"flex",gap:6,alignItems:"center"}}>
                    <input style={{...inp,width:70,fontSize:12,padding:"6px 8px"}} type="number" value={editCal} onChange={ev=>setEditCal(ev.target.value)} autoFocus/>
                    <button style={{...btn("success"),fontSize:11,padding:"6px 10px"}} onClick={()=>saveEditCal(i)}>✓</button>
                  </div>
                ):(
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:13,fontWeight:700,color:C.gold,cursor:"pointer"}} onClick={()=>{setEditingIdx(i);setEditCal(String(e.cal));}}>{e.cal} ✏️</span>
                    <button style={{background:"none",border:"none",color:C.red,cursor:"pointer",fontSize:16}} onClick={()=>removeEntry(i)}>×</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Weekly calorie comparison */}
        {(thisWeekAvg>0||lastWeekAvg>0)&&(
          <div style={{...card,border:`1px solid ${C.goldDim}`}}>
            <div style={{fontSize:13,fontWeight:700,marginBottom:12}}>📊 Weekly Calorie Comparison</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
              <div style={{background:"#0f0800",borderRadius:8,padding:10,border:`1px solid ${C.goldDim}`}}>
                <div style={{fontSize:9,color:C.gold,textTransform:"uppercase",letterSpacing:1}}>This Week Avg</div>
                <div style={{fontSize:22,fontWeight:800,color:C.gold,marginTop:4}}>{thisWeekAvg}<span style={{fontSize:11,color:C.muted}}> kcal</span></div>
              </div>
              <div style={{background:"#111",borderRadius:8,padding:10}}>
                <div style={{fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:1}}>Last Week Avg</div>
                <div style={{fontSize:22,fontWeight:800,color:C.muted,marginTop:4}}>{lastWeekAvg||"—"}<span style={{fontSize:11,color:C.muted}}>{lastWeekAvg?" kcal":""}</span></div>
              </div>
            </div>
            <div style={{display:"flex",gap:4}}>
              {thisWeekTotals.map((d,i)=>{
                const h = d.total>0?Math.max(10,Math.min(60,(d.total/2000)*60)):4;
                const isToday=d.date===today;
                return(
                  <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                    <div style={{width:"100%",background:isToday?C.gold:d.total>target?C.red:d.total>0?C.green:"#1a1a1a",borderRadius:"3px 3px 0 0",height:`${h}px`,transition:"height 0.5s"}}/>
                    <div style={{fontSize:8,color:isToday?C.gold:C.muted}}>{"MTWTFS"[i]}</div>
                  </div>
                );
              })}
            </div>
            <div style={{display:"flex",gap:12,justifyContent:"center",marginTop:8,fontSize:9,color:C.muted}}>
              <span style={{color:C.green}}>■ On track</span>
              <span style={{color:C.red}}>■ Over target</span>
              <span style={{color:C.gold}}>■ Today</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ═══════════════════════════════════
  // MEALS TAB
  // ═══════════════════════════════════
  const MealsTab = () => {
    const todayHerbal = data.herbal[today] || [];
    const [herbalQty, setHerbalQty] = useState({});
    const weekIFLevel = data.weeklyIFLevel?.[thisWeekKey] || null;
    const weekStartTime = data.weeklyIFStartTime?.[thisWeekKey] || "";
    const isFastingDay = data.fastingDays?.[today] || false;
    const ifData = IF_LEVELS.find(l => l.id === weekIFLevel) || null;
    const todayCalEntries = data.calorieEntries?.[today] || {};
    const [decreeChecked, setDecreeChecked] = useState(data.decreeChecked?.[today] || {});
    const [calorieTarget, setCalTarget] = useState(data.calorieTarget || 1400);
    const [showTargetEdit, setShowTargetEdit] = useState(false);
    const [manualTarget, setManualTarget] = useState("");
    const [userHeight, setUserHeight] = useState(155);
    const calcAutoTarget = (w, h) => Math.round((10*w + 6.25*h - 5*25 - 161) * 1.2 * 0.8);

    const saveDecree = (val) => {
      setDecreeChecked(val);
      save({ decreeChecked: { ...data.decreeChecked, [today]: val } });
    };

    const herbalCal = todayHerbal.reduce((s, i) => s + Math.round((HERBAL[i]?.cal || 0) * (herbalQty[i] || 1)), 0);

    const getMealEntries = (slot) => todayCalEntries?.[slot] || [];
    const addMealEntry = (slot, food) => {
      const ex = { ...(data.calorieEntries?.[today] || {}) };
      ex[slot] = [...(ex[slot] || []), { name: food.name, cal: food.cal }];
      save({ calorieEntries: { ...data.calorieEntries, [today]: ex } });
    };
    const removeMealEntry = (slot, idx) => {
      const ex = { ...(data.calorieEntries?.[today] || {}) };
      ex[slot] = (ex[slot] || []).filter((_, i) => i !== idx);
      save({ calorieEntries: { ...data.calorieEntries, [today]: ex } });
    };
    const editMealEntry = (slot, idx, cal) => {
      const ex = { ...(data.calorieEntries?.[today] || {}) };
      const arr = [...(ex[slot] || [])];
      arr[idx] = { ...arr[idx], cal };
      ex[slot] = arr;
      save({ calorieEntries: { ...data.calorieEntries, [today]: ex } });
    };

    const mealSlots = isFastingDay ? ["Liquids"] : (ifData?.meals || []);
    const mealCalTotal = mealSlots.reduce((s, slot) => s + getMealEntries(slot).reduce((ss, e) => ss + (e.cal || 0), 0), 0);
    const totalDayCal = herbalCal + mealCalTotal;

    const setIFLevel = (lvId, startTime) => {
      save({
        weeklyIFLevel: { ...data.weeklyIFLevel, [thisWeekKey]: lvId },
        weeklyIFStartTime: { ...data.weeklyIFStartTime, [thisWeekKey]: startTime },
      });
    };

    const calcDisciplineStreak = () => {
      let streak = 0; const d = new Date();
      for (let i = 0; i < 365; i++) {
        const ds = d.toISOString().split("T")[0];
        const h = data.herbal[ds] || [];
        const e = data.calorieEntries?.[ds] || {};
        const f = data.fastingDays?.[ds];
        if (!h.length && !Object.values(e).flat().length && !f) break;
        streak++; d.setDate(d.getDate() - 1);
      }
      return streak;
    };
    const disciplineStreak = calcDisciplineStreak();
    const nextTarget = DISC_TARGETS.find(t => disciplineStreak < t) || 90;
    const nextXP = DISC_XP[DISC_TARGETS.indexOf(nextTarget)] || 3500;
    const prevTarget = DISC_TARGETS[DISC_TARGETS.indexOf(nextTarget) - 1] || 0;
    const discPct = Math.min(100, ((disciplineStreak - prevTarget) / (nextTarget - prevTarget)) * 100);

    return (
      <div style={{ padding: "16px 16px 0" }}>

        {/* Discipline Streak */}
        <div style={{ ...card, background: disciplineStreak >= 14 ? "linear-gradient(135deg,#0a1a00,#111)" : "linear-gradient(135deg,#0f0800,#111)", border: `1px solid ${disciplineStreak >= 14 ? C.green : C.goldDim}` }}>
          <div style={{ fontSize: 10, color: disciplineStreak >= 14 ? C.green : C.gold, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>⚔️ Discipline Streak</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 32, fontWeight: 900, color: disciplineStreak >= 14 ? C.green : C.gold, lineHeight: 1 }}>{disciplineStreak}<span style={{ fontSize: 13, fontWeight: 400, color: C.muted }}> days</span></div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>{nextTarget - disciplineStreak} days to next milestone</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: C.muted }}>Next reward</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.gold }}>{nextTarget}d → +{nextXP} XP</div>
            </div>
          </div>
          <div style={{ height: 6, background: "#1a1a1a", borderRadius: 3, overflow: "hidden", marginBottom: 8 }}>
            <div style={{ height: "100%", width: `${discPct.toFixed(1)}%`, background: disciplineStreak >= 14 ? C.green : C.gold, borderRadius: 3, transition: "width 0.8s" }} />
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {DISC_TARGETS.map(t => (
              <div key={t} style={{ fontSize: 9, padding: "3px 8px", borderRadius: 12, background: disciplineStreak >= t ? "#0a2a0a" : "#1a1a1a", border: `1px solid ${disciplineStreak >= t ? C.green : C.border}`, color: disciplineStreak >= t ? C.green : C.muted }}>
                {disciplineStreak >= t ? "✓ " : ""}{t}d
              </div>
            ))}
          </div>
        </div>

        {/* IF Level */}
        <div style={{ ...card, border: `1px solid ${ifData ? ifData.color + "44" : C.border}` }}>
          <div style={{ fontSize: 10, color: C.gold, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>⏱ This Week's IF Level</div>
          {!weekIFLevel
            ? <IFLevelSelector onSelect={setIFLevel} />
            : <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: ifData.color }}>Level {ifData.id} — {ifData.name}</div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>🕐 <span style={{ color: ifData.color, fontWeight: 700 }}>{weekStartTime ? `${formatStartTime(weekStartTime)} → ${calcEndTime(weekStartTime, ifData.hours)}` : ""}</span></div>
                    <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{ifData.hours}hr · {ifData.meals.join(", ")}</div>
                  </div>
                  <div style={{ background: ifData.color + "22", borderRadius: 8, padding: "8px 12px", textAlign: "center", border: `1px solid ${ifData.color}44` }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: ifData.color }}>{ifData.hours}h</div>
                    <div style={{ fontSize: 9, color: C.muted }}>window</div>
                  </div>
                </div>
                <WeekDateTabs battleStartDate={data.battleStartDate} />
              </div>
          }
        </div>

        {/* Fasting toggle */}
        {weekIFLevel && (
          <div style={{ ...card, border: isFastingDay ? `1px solid #818cf8` : `1px solid ${C.border}`, background: isFastingDay ? "#0a0a1a" : C.card }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: isFastingDay ? "#818cf8" : C.text }}>Today's Mode</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{isFastingDay ? "⚡ Fast Day — liquids only" : "🍽️ Meal Day — eating window active"}</div>
              </div>
              <button style={{ ...btn(isFastingDay ? "ghost" : "primary"), border: isFastingDay ? `1px solid #818cf8` : "none", color: isFastingDay ? "#818cf8" : "#000", fontSize: 12, padding: "7px 14px" }}
                onClick={() => save({ fastingDays: { ...data.fastingDays, [today]: !isFastingDay } })}>
                {isFastingDay ? "🍽️ Meal Day" : "⚡ Fast Today"}
              </button>
            </div>
          </div>
        )}

        {/* Herbalife */}
        <div style={{ ...card, border: `1px solid ${C.goldDim}`, background: "#0a0800" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.gold }}>Herbalife Protocol</div>
            <div style={{ fontSize: 12, color: C.gold, fontWeight: 700 }}>{herbalCal} kcal</div>
          </div>
          {HERBAL.map((h, i) => {
            const checked = todayHerbal.includes(i);
            const qty = herbalQty[i] || 1;
            const itemCal = Math.round(h.cal * qty);
            return (
              <div key={i} style={{ padding: "8px 0", borderBottom: i < HERBAL.length - 1 ? `1px solid ${C.border}` : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
                  onClick={() => { const curr = data.herbal[today] || []; save({ herbal: { ...data.herbal, [today]: curr.includes(i) ? curr.filter(x => x !== i) : [...curr, i] } }); }}>
                  <div style={{ width: 22, height: 22, borderRadius: 5, background: checked ? C.gold : "#111", border: `1px solid ${checked ? C.gold : C.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s" }}>
                    {checked && <span style={{ fontSize: 12, color: "#000", fontWeight: 800 }}>✓</span>}
                  </div>
                  <span style={{ flex: 1, fontSize: 13, color: checked ? C.muted : C.text, textDecoration: checked ? "line-through" : "none" }}>{h.name}</span>
                  <span style={{ fontSize: 11, color: checked ? C.gold : C.muted, fontWeight: 700 }}>{itemCal} kcal</span>
                </div>
                {checked && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, marginLeft: 32 }}>
                    <span style={{ fontSize: 10, color: C.muted }}>Qty:</span>
                    <button style={{ width: 24, height: 24, borderRadius: 6, background: "#1a1a1a", border: `1px solid ${C.border}`, color: C.text, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                      onClick={() => setHerbalQty(p => ({ ...p, [i]: Math.max(0.5, (p[i] || 1) - 0.5) }))}>−</button>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.gold, minWidth: 24, textAlign: "center" }}>{qty}</span>
                    <button style={{ width: 24, height: 24, borderRadius: 6, background: "#1a1a1a", border: `1px solid ${C.border}`, color: C.text, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                      onClick={() => setHerbalQty(p => ({ ...p, [i]: (p[i] || 1) + 0.5 }))}>+</button>
                    <span style={{ fontSize: 10, color: C.muted }}>× {h.cal} = <span style={{ color: C.gold, fontWeight: 700 }}>{itemCal} kcal</span></span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Meal Slots */}
        {weekIFLevel && !isFastingDay && ifData?.meals.map(slot => {
          const entries = getMealEntries(slot);
          const slotCal = entries.reduce((s, e) => s + (e.cal || 0), 0);
          return (
            <div key={slot} style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{slot}</div>
                {slotCal > 0 && <div style={{ fontSize: 12, color: C.gold, fontWeight: 700 }}>{slotCal} kcal</div>}
              </div>
              <div style={{ fontSize: 10, color: C.muted, marginBottom: 6 }}>
                {weekStartTime ? `${formatStartTime(weekStartTime)} → ${calcEndTime(weekStartTime, ifData.hours)}` : ""}
              </div>
              <CalorieSection slot={slot} entries={entries}
                onAdd={f => addMealEntry(slot, f)}
                onRemove={idx => removeMealEntry(slot, idx)}
                onEdit={(idx, cal) => editMealEntry(slot, idx, cal)}
                customFoods={data.customFoods || {}}
                onAddCustom={f => save({ customFoods: { ...data.customFoods, [`custom_${Date.now()}`]: f } })} />
            </div>
          );
        })}

        {/* Fast Day */}
        {weekIFLevel && isFastingDay && (
          <FastDayLog
            entries={getMealEntries("Liquids")}
            onAdd={f => addMealEntry("Liquids", f)}
            onRemove={idx => removeMealEntry("Liquids", idx)}
            onEdit={(idx, cal) => editMealEntry("Liquids", idx, cal)}
            customFoods={data.customFoods || {}}
            onAddCustom={f => save({ customFoods: { ...data.customFoods, [`custom_${Date.now()}`]: f } })}
            ifWindow={weekStartTime ? `${formatStartTime(weekStartTime)} → ${calcEndTime(weekStartTime, ifData?.hours || 8)}` : ""} />
        )}

        {/* Daily Calories */}
        {weekIFLevel && (
          <div style={{ ...card, background: "linear-gradient(135deg,#0a1200,#111)", border: `1px solid ${totalDayCal > calorieTarget ? C.red : C.green}44` }}>
            <div style={{ fontSize: 10, color: C.green, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>🔥 Today's Calories</div>
            <div style={{ background: "#111", borderRadius: 8, padding: 10, marginBottom: 12, border: `1px solid #2a2a2a` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 10, color: C.muted }}>Daily Target</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: C.gold }}>{calorieTarget} <span style={{ fontSize: 11, fontWeight: 400, color: C.muted }}>kcal</span></div>
                </div>
                <button style={{ ...btn("ghost"), fontSize: 10, padding: "5px 10px" }} onClick={() => setShowTargetEdit(e => !e)}>
                  {showTargetEdit ? "Done" : "✏️ Change"}
                </button>
              </div>
              {showTargetEdit && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>Weight (kg)</div>
                      <input style={inp} type="number" defaultValue={data.currentWeight || 94} onChange={e => {}} />
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>Height (cm)</div>
                      <input style={inp} type="number" value={userHeight} onChange={e => setUserHeight(parseFloat(e.target.value) || 155)} />
                    </div>
                  </div>
                  <button style={{ ...btn("success"), width: "100%", fontSize: 12, marginBottom: 8 }}
                    onClick={() => { const t = calcAutoTarget(data.currentWeight || 94, userHeight); setCalTarget(t); save({ calorieTarget: t }); setShowTargetEdit(false); }}>
                    ⚡ Auto-Calculate
                  </button>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input style={{ ...inp, flex: 1 }} type="number" placeholder="Enter manually..." value={manualTarget} onChange={e => setManualTarget(e.target.value)} />
                    <button style={btn()} onClick={() => { if (manualTarget) { const t = parseInt(manualTarget); setCalTarget(t); save({ calorieTarget: t }); setManualTarget(""); setShowTargetEdit(false); } }}>Set</button>
                  </div>
                </div>
              )}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
              <div style={{ background: "#111", borderRadius: 8, padding: 10, textAlign: "center" }}>
                <div style={{ fontSize: 9, color: C.muted }}>Herbalife</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: C.gold }}>{herbalCal}</div>
              </div>
              <div style={{ background: "#111", borderRadius: 8, padding: 10, textAlign: "center" }}>
                <div style={{ fontSize: 9, color: C.muted }}>Meals</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: C.green }}>{mealCalTotal}</div>
              </div>
              <div style={{ background: totalDayCal > calorieTarget ? "#1c0505" : "#0a1a00", borderRadius: 8, padding: 10, textAlign: "center", border: `2px solid ${totalDayCal > calorieTarget ? C.red : C.green}` }}>
                <div style={{ fontSize: 9, color: totalDayCal > calorieTarget ? C.red : C.green }}>Total</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: totalDayCal > calorieTarget ? C.red : C.green }}>{totalDayCal}</div>
              </div>
            </div>
            <div style={{ height: 8, background: "#1a1a1a", borderRadius: 4, overflow: "hidden", marginBottom: 6 }}>
              <div style={{ height: "100%", width: `${Math.min(100, (totalDayCal / calorieTarget) * 100).toFixed(1)}%`, background: totalDayCal > calorieTarget ? C.red : C.green, borderRadius: 4, transition: "width 0.8s" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", borderRadius: 8, background: totalDayCal > calorieTarget ? "#1c0505" : "#052e16", border: `1px solid ${totalDayCal > calorieTarget ? C.red : C.green}44`, marginTop: 4 }}>
              <div style={{ fontSize: 11, color: totalDayCal > calorieTarget ? C.red : C.green, fontWeight: 700 }}>{totalDayCal > calorieTarget ? "⚠️ Excess" : "✅ Deficit"}</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: totalDayCal > calorieTarget ? C.red : C.green }}>{totalDayCal > calorieTarget ? "+" : "-"}{Math.abs(calorieTarget - totalDayCal)} kcal</div>
              <div style={{ fontSize: 10, color: C.muted }}>{totalDayCal > calorieTarget ? "over target" : "under target"}</div>
            </div>
          </div>
        )}

        {/* Kingdom Decree */}
        <KingdomDecree
          ifData={ifData}
          startTime={weekStartTime}
          decreeChecked={decreeChecked}
          setDecreeChecked={saveDecree}
          totalDayCal={totalDayCal}
          calorieTarget={calorieTarget} />
      </div>
    );
  };

  // ═══════════════════════════════════
  // THE HOURGLASS TAB
  // ═══════════════════════════════════
  const HourglassTab = () => {
    const [hTab,setHTab] = useState("timer");
    const [selAct,setSelAct] = useState(data.timerActivity||"Deep Work");
    const [selCat,setSelCat] = useState(data.timerCategory||"forge");
    const [elapsed,setElapsed] = useState(0);

    useEffect(()=>{
      if(!data.timerActive){setElapsed(0);return;}
      const iv=setInterval(()=>setElapsed(Math.floor((Date.now()-data.timerStart)/1000)),1000);
      return()=>clearInterval(iv);
    },[data.timerActive,data.timerStart]);

    const fmtTime=(s)=>`${String(Math.floor(s/3600)).padStart(2,"0")}:${String(Math.floor((s%3600)/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

    const FORGE_ACTS = ["Deep Work","Exercise","Learning","Creative","Planning","Skill Build"];
    const VOID_ACTS  = ["Social Media","TV/Netflix","Idle Scroll","Distraction","Overthinking","Procrastin."];
    const allActs = [...FORGE_ACTS,...VOID_ACTS];
    const FORGE_COLOR = "#f59e0b";
    const VOID_COLOR  = "#6366f1";

    const todayLog = data.timeLog[today]||[];

    const getWeekLogs = (offset=0) => {
      const dates = Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-((dayOfWeek+6)%7)+i-(offset*7));return d.toISOString().split("T")[0];});
      return dates.flatMap(d=>data.timeLog[d]||[]);
    };

    const calcTotals = (logs) => {
      const forge = logs.filter(e=>FORGE_ACTS.includes(e.activity)).reduce((s,e)=>s+e.duration,0);
      const vd    = logs.filter(e=>VOID_ACTS.includes(e.activity)).reduce((s,e)=>s+e.duration,0);
      return {forge, void:vd, total:forge+vd};
    };

    const todayTotals   = calcTotals(todayLog);
    const weekLogs      = getWeekLogs(0);
    const weekTotals    = calcTotals(weekLogs);

    // Per-activity totals for week
    const actTotalsWeek = {};
    allActs.forEach(a=>{ actTotalsWeek[a]=weekLogs.filter(e=>e.activity===a).reduce((s,e)=>s+e.duration,0); });

    // Daily breakdown for chart
    const dailyBreakdown = Array.from({length:7},(_,i)=>{
      const d=new Date();d.setDate(d.getDate()-((dayOfWeek+6)%7)+i);
      const ds=d.toISOString().split("T")[0];
      const logs=data.timeLog[ds]||[];
      const t=calcTotals(logs);
      return { day:["Mo","Tu","We","Th","Fr","Sa","Su"][i], forge:+(t.forge/60).toFixed(1), void:+(t.void/60).toFixed(1) };
    });

    const stopTimer = () => {
      const mins=Math.floor((Date.now()-data.timerStart)/60000);
      const entry={activity:data.timerActivity,category:data.timerCategory,duration:Math.max(1,mins),time:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})};
      if(data.timerCategory==="forge") grantXP(Math.floor(mins/5)*5,"willpower");
      save({timerActive:false,timerStart:null,timeLog:{...data.timeLog,[today]:[...(data.timeLog[today]||[]),entry]}});
    };

    const hBtn = (id,label,color) => (
      <button onClick={()=>setHTab(id)} style={{padding:"8px 14px",borderRadius:8,border:"none",background:hTab===id?color:"#1e1e1e",color:hTab===id?"#000":"#888",fontWeight:hTab===id?700:400,fontSize:12,cursor:"pointer",whiteSpace:"nowrap"}}>{label}</button>
    );

    return (
      <div style={{padding:"16px 16px 0"}}>
        {/* Header */}
        <div style={{...card,background:"linear-gradient(135deg,#0d0800,#111)",border:`1px solid ${C.goldDim}`,marginBottom:12}}>
          <div style={{fontSize:10,color:C.gold,letterSpacing:3,textTransform:"uppercase",marginBottom:6}}>⌛ THE HOURGLASS</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <div style={{background:"#0a0800",borderRadius:8,padding:10,border:`1px solid ${FORGE_COLOR}33`}}>
              <div style={{fontSize:9,color:FORGE_COLOR,letterSpacing:1,textTransform:"uppercase",marginBottom:4}}>⚡ The Forge</div>
              <div style={{fontSize:9,color:"#777",marginBottom:4}}>Productive hours</div>
              <div style={{fontSize:20,fontWeight:800,color:FORGE_COLOR}}>{(todayTotals.forge/60).toFixed(1)}<span style={{fontSize:10,fontWeight:400}}> h today</span></div>
              <div style={{fontSize:10,color:"#666",marginTop:2}}>{(weekTotals.forge/60).toFixed(1)}h this week</div>
            </div>
            <div style={{background:"#06060e",borderRadius:8,padding:10,border:`1px solid ${VOID_COLOR}33`}}>
              <div style={{fontSize:9,color:VOID_COLOR,letterSpacing:1,textTransform:"uppercase",marginBottom:4}}>🌑 The Void</div>
              <div style={{fontSize:9,color:"#777",marginBottom:4}}>Non-productive hours</div>
              <div style={{fontSize:20,fontWeight:800,color:VOID_COLOR}}>{(todayTotals.void/60).toFixed(1)}<span style={{fontSize:10,fontWeight:400}}> h today</span></div>
              <div style={{fontSize:10,color:"#666",marginTop:2}}>{(weekTotals.void/60).toFixed(1)}h this week</div>
            </div>
          </div>
          {todayTotals.total>0&&(
            <div style={{marginTop:10}}>
              <div style={{fontSize:9,color:"#555",marginBottom:4}}>Today — Forge vs Void ratio</div>
              <div style={{height:8,borderRadius:4,overflow:"hidden",background:`#111`,display:"flex"}}>
                <div style={{height:"100%",width:`${(todayTotals.forge/todayTotals.total*100).toFixed(1)}%`,background:FORGE_COLOR,transition:"width 0.8s"}}/>
                <div style={{height:"100%",flex:1,background:VOID_COLOR}}/>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:"#555",marginTop:3}}>
                <span style={{color:FORGE_COLOR}}>⚡ {(todayTotals.forge/todayTotals.total*100).toFixed(0)}% Forge</span>
                <span style={{color:VOID_COLOR}}>{(todayTotals.void/todayTotals.total*100).toFixed(0)}% Void 🌑</span>
              </div>
            </div>
          )}
        </div>

        {/* Sub nav */}
        <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:12}}>
          {hBtn("timer","⏱ Timer",FORGE_COLOR)}
          {hBtn("today","📊 Today",FORGE_COLOR)}
          {hBtn("weekly","📅 Weekly",VOID_COLOR)}
        </div>

        {hTab==="timer"&&(
          <div>
            <div style={{...card,textAlign:"center"}}>
              {data.timerActive?(
                <>
                  <div style={{fontSize:42,fontWeight:800,fontFamily:"monospace",color:data.timerCategory==="forge"?FORGE_COLOR:VOID_COLOR,letterSpacing:2}}>{fmtTime(elapsed)}</div>
                  <div style={{fontSize:13,color:C.muted,margin:"6px 0 4px"}}>
                    <span style={{color:data.timerCategory==="forge"?FORGE_COLOR:VOID_COLOR,fontWeight:700}}>{data.timerCategory==="forge"?"⚡ Forge":"🌑 Void"}</span>
                    {" · "}{data.timerActivity}
                  </div>
                  {data.timerCategory==="forge"&&<div style={{fontSize:10,color:C.gold,marginBottom:10}}>+{Math.floor(elapsed/60)*1} XP earned so far</div>}
                  <button style={{...btn(data.timerCategory==="forge"?"primary":"ghost"),fontSize:15,padding:"12px 36px",borderRadius:12,border:data.timerCategory==="void"?`1px solid ${VOID_COLOR}`:"none",color:data.timerCategory==="void"?VOID_COLOR:"#000"}} onClick={stopTimer}>⏹ Stop & Save</button>
                </>
              ):(
                <>
                  <div style={{display:"flex",gap:8,justifyContent:"center",marginBottom:14}}>
                    <button onClick={()=>setSelCat("forge")} style={{flex:1,padding:"10px",borderRadius:8,border:`1px solid ${selCat==="forge"?FORGE_COLOR:"#333"}`,background:selCat==="forge"?"#1c1000":"#111",color:selCat==="forge"?FORGE_COLOR:"#666",fontWeight:selCat==="forge"?700:400,fontSize:13,cursor:"pointer"}}>⚡ The Forge</button>
                    <button onClick={()=>setSelCat("void")} style={{flex:1,padding:"10px",borderRadius:8,border:`1px solid ${selCat==="void"?VOID_COLOR:"#333"}`,background:selCat==="void"?"#08080e":"#111",color:selCat==="void"?VOID_COLOR:"#666",fontWeight:selCat==="void"?700:400,fontSize:13,cursor:"pointer"}}>🌑 The Void</button>
                  </div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6,justifyContent:"center",marginBottom:14}}>
                    {(selCat==="forge"?FORGE_ACTS:VOID_ACTS).map(a=>(
                      <button key={a} style={{padding:"7px 12px",borderRadius:7,border:`1px solid ${selAct===a?(selCat==="forge"?FORGE_COLOR:VOID_COLOR):"#2a2a2a"}`,background:selAct===a?(selCat==="forge"?"#1c1000":"#08080e"):"#161616",color:selAct===a?(selCat==="forge"?FORGE_COLOR:VOID_COLOR):"#777",fontSize:12,cursor:"pointer"}} onClick={()=>setSelAct(a)}>{a}</button>
                    ))}
                  </div>
                  <button style={{...btn(selCat==="forge"?"primary":"ghost"),fontSize:15,padding:"13px 40px",borderRadius:12,border:selCat==="void"?`1px solid ${VOID_COLOR}`:"none",color:selCat==="void"?VOID_COLOR:"#000"}}
                    onClick={()=>save({timerActive:true,timerStart:Date.now(),timerActivity:selAct,timerCategory:selCat})}>▶ Start</button>
                </>
              )}
            </div>

            {todayLog.length>0&&(
              <div style={card}>
                <div style={{fontSize:13,fontWeight:700,marginBottom:10}}>Today's Chronicle</div>
                {todayLog.map((e,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderBottom:i<todayLog.length-1?`1px solid ${C.border}`:"none"}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:FORGE_ACTS.includes(e.activity)?FORGE_COLOR:VOID_COLOR,flexShrink:0}}/>
                    <span style={{flex:1,fontSize:13}}>{e.activity}</span>
                    <span style={{fontSize:10,color:C.muted}}>{e.time}</span>
                    <span style={{fontSize:12,fontWeight:700,color:FORGE_ACTS.includes(e.activity)?FORGE_COLOR:VOID_COLOR}}>{e.duration<60?`${e.duration}m`:`${(e.duration/60).toFixed(1)}h`}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {hTab==="today"&&(
          <div>
            {todayTotals.total===0 ? (
              <div style={{...card,textAlign:"center",padding:40}}><div style={{fontSize:40}}>⌛</div><div style={{fontSize:14,fontWeight:700,marginTop:10}}>No time logged today</div><div style={{fontSize:12,color:C.muted,marginTop:6}}>Start the timer to track where your day goes.</div></div>
            ) : (
              <>
                <div style={card}>
                  <div style={{fontSize:13,fontWeight:700,marginBottom:12}}>Today's Time Split</div>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={[
                        ...FORGE_ACTS.filter(a=>actTotalsWeek[a]>0||todayLog.some(e=>e.activity===a)).map(a=>({name:a,value:todayLog.filter(e=>e.activity===a).reduce((s,e)=>s+e.duration,0),cat:"forge"})).filter(d=>d.value>0),
                        ...VOID_ACTS.filter(a=>todayLog.some(e=>e.activity===a)).map(a=>({name:a,value:todayLog.filter(e=>e.activity===a).reduce((s,e)=>s+e.duration,0),cat:"void"})).filter(d=>d.value>0),
                      ]} cx="50%" cy="50%" outerRadius={65} dataKey="value">
                        {[...FORGE_ACTS,...VOID_ACTS].map((a,i)=><Cell key={i} fill={FORGE_ACTS.includes(a)?`hsl(45,90%,${50-i*4}%)`:`hsl(240,60%,${55+i*4}%)`}/>)}
                      </Pie>
                      <Tooltip formatter={v=>[`${v} min`]} contentStyle={{background:"#1a1a1a",border:`1px solid ${C.border}`,borderRadius:8,fontSize:11}}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {[{label:"⚡ The Forge",acts:FORGE_ACTS,color:FORGE_COLOR},{label:"🌑 The Void",acts:VOID_ACTS,color:VOID_COLOR}].map(section=>{
                  const sectionLogs = todayLog.filter(e=>section.acts.includes(e.activity));
                  if(sectionLogs.length===0) return null;
                  return (
                    <div key={section.label} style={{...card,border:`1px solid ${section.color}22`}}>
                      <div style={{fontSize:12,fontWeight:700,color:section.color,marginBottom:10}}>{section.label}</div>
                      {section.acts.map(a=>{
                        const mins=sectionLogs.filter(e=>e.activity===a).reduce((s,e)=>s+e.duration,0);
                        if(!mins) return null;
                        return <div key={a} style={{display:"flex",justifyContent:"space-between",fontSize:12,padding:"5px 0",borderBottom:`1px solid ${C.border}`}}><span style={{color:C.muted}}>{a}</span><span style={{color:section.color,fontWeight:600}}>{mins<60?`${mins}m`:`${(mins/60).toFixed(1)}h`}</span></div>;
                      })}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}

        {hTab==="weekly"&&(
          <div>
            <div style={card}>
              <div style={{fontSize:13,fontWeight:700,marginBottom:12}}>Weekly Forge vs Void</div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={dailyBreakdown} barCategoryGap="20%">
                  <XAxis dataKey="day" tick={{fontSize:10,fill:C.muted}}/>
                  <YAxis tick={{fontSize:9,fill:C.muted}} width={24}/>
                  <Tooltip contentStyle={{background:"#1a1a1a",border:`1px solid ${C.border}`,borderRadius:8,fontSize:11}}/>
                  <Bar dataKey="forge" name="⚡ Forge" stackId="a" fill={FORGE_COLOR} radius={[0,0,0,0]}/>
                  <Bar dataKey="void"  name="🌑 Void"  stackId="a" fill={VOID_COLOR}  radius={[3,3,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
              <div style={{display:"flex",gap:16,justifyContent:"center",marginTop:6}}>
                <span style={{fontSize:10,color:FORGE_COLOR}}>■ Forge (productive)</span>
                <span style={{fontSize:10,color:VOID_COLOR}}>■ Void (non-productive)</span>
              </div>
            </div>

            <div style={card}>
              <div style={{fontSize:13,fontWeight:700,marginBottom:12}}>This Week's Top Activities</div>
              <div style={{fontSize:11,color:FORGE_COLOR,fontWeight:600,marginBottom:8}}>⚡ Forge</div>
              {FORGE_ACTS.filter(a=>actTotalsWeek[a]>0).sort((a,b)=>actTotalsWeek[b]-actTotalsWeek[a]).map(a=>(
                <div key={a} style={{marginBottom:8}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:3}}><span>{a}</span><span style={{color:FORGE_COLOR}}>{actTotalsWeek[a]<60?`${actTotalsWeek[a]}m`:`${(actTotalsWeek[a]/60).toFixed(1)}h`}</span></div>
                  <div style={{height:4,background:"#222",borderRadius:2}}><div style={{height:"100%",width:`${(actTotalsWeek[a]/Math.max(...FORGE_ACTS.map(x=>actTotalsWeek[x]||1)))*100}%`,background:FORGE_COLOR,borderRadius:2}}/></div>
                </div>
              ))}
              {FORGE_ACTS.every(a=>!actTotalsWeek[a])&&<div style={{fontSize:12,color:C.muted}}>No Forge time logged this week yet.</div>}
              <div style={{fontSize:11,color:VOID_COLOR,fontWeight:600,marginBottom:8,marginTop:14}}>🌑 Void</div>
              {VOID_ACTS.filter(a=>actTotalsWeek[a]>0).sort((a,b)=>actTotalsWeek[b]-actTotalsWeek[a]).map(a=>(
                <div key={a} style={{marginBottom:8}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:3}}><span style={{color:C.muted}}>{a}</span><span style={{color:VOID_COLOR}}>{actTotalsWeek[a]<60?`${actTotalsWeek[a]}m`:`${(actTotalsWeek[a]/60).toFixed(1)}h`}</span></div>
                  <div style={{height:4,background:"#222",borderRadius:2}}><div style={{height:"100%",width:`${(actTotalsWeek[a]/Math.max(...VOID_ACTS.map(x=>actTotalsWeek[x]||1)))*100}%`,background:VOID_COLOR,borderRadius:2}}/></div>
                </div>
              ))}
              {VOID_ACTS.every(a=>!actTotalsWeek[a])&&<div style={{fontSize:12,color:C.muted}}>No Void time this week! 👑</div>}
            </div>

            {weekTotals.total>0&&(
              <div style={{...card,border:`1px solid ${weekTotals.forge>weekTotals.void?C.green:C.red}44`}}>
                <div style={{fontSize:13,fontWeight:700,marginBottom:8}}>Weekly Verdict</div>
                {weekTotals.forge>weekTotals.void
                  ? <div style={{fontSize:13,color:C.green}}>⚡ Forge dominates! You spent {(weekTotals.forge/60).toFixed(1)}h building vs {(weekTotals.void/60).toFixed(1)}h in the Void. Eiraya is a machine.</div>
                  : <div style={{fontSize:13,color:C.red}}>🌑 The Void claims more hours than the Forge. {(weekTotals.void/60).toFixed(1)}h lost. Reclaim your time warrior.</div>
                }
              </div>
            )}
          </div>
        )}
      </div>
    );
  };


  // ═══════════════════════════════════
  // ORACLE TAB (AI Coach in RPG mode)
  // ═══════════════════════════════════
  const OracleTab = () => {
    const [input,setInput] = useState("");
    const [loading,setLoading] = useState(false);
    const [msgs,setMsgs] = useState(data.chatHistory||[]);
    const endRef = useRef(null);
    useEffect(()=>{ endRef.current?.scrollIntoView({behavior:"smooth"}); },[msgs,loading]);

    const quickPrompts = [
      {label:"🍕 I want junk food",     text:"I want to eat junk food right now. Speak to me as the Oracle — give me dark fantasy tough love to stop me."},
      {label:"😩 I have no will",        text:"My willpower stat is empty today. I want to give up. Speak to me as the Oracle."},
      {label:"⚔️ Hype me for battle",    text:"I'm about to train. Give me a warrior's battle cry as the Oracle of FitQuest."},
      {label:"📜 Read my prophecy",      text:"Read my prophecy, Oracle. I am Eiraya, currently at "+data.currentWeight+"kg, level "+level+". What does the future hold?"},
      {label:"🌑 I broke my streak",     text:"I broke my streak. I failed. Speak to me Oracle — not to comfort, but to remind me who I am."},
      {label:"✨ Celebrate my progress", text:"Celebrate my progress with me Oracle. I've lost "+kgLost+"kg and reached level "+level+"."},
    ];

    const send = async (text) => {
      if(!text.trim()||loading) return;
      const um={role:"user",content:text};
      const newMsgs=[...msgs,um];
      setMsgs(newMsgs); setInput(""); setLoading(true);
      try {
        const res = await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:350,system:`You are the Oracle of FitQuest — an ancient, mystical being who speaks in dark fantasy RPG language. You serve Eiraya, a warrior on a sacred quest to transform her body and spirit.

Key facts about Eiraya's quest:
- Current weight: ${data.currentWeight}kg | Ultimate goal: 48kg | Lost so far: ${kgLost}kg from 94kg
- Current kingdom: ${kingdom.name} | Level: ${level} | Streak: ${data.streak} days
- Character stats: Strength ${data.stats.strength} · Agility ${data.stats.agility} · Willpower ${data.stats.willpower} · Vitality ${data.stats.vitality} · Fire ${data.stats.fire}
- ${data.sick ? "WARNING: Eiraya is currently weakened/sick from a broken streak" : "Currently healthy and on her path"}

Oracle rules:
- Always speak in 2nd person to Eiraya. Use "warrior", "Eiraya", "your quest", "your kingdom"
- Use vivid fantasy metaphors for real health concepts (food = potions/poison, exercise = battle/training, fat = armor of the old self, weight loss = unlocking power)
- Be FIERCELY motivating, sometimes harsh, sometimes poetic — never generic
- Keep responses under 4 paragraphs
- Occasionally end with a short dramatic prophecy or quote
- Use Hindi words naturally: yaar, arre, bas, shayad, dekh`,
            messages:newMsgs.slice(-12)})});
        const d=await res.json();
        const reply=d.content[0]?.text||"The Oracle is silent... but watching.";
        const updated=[...newMsgs,{role:"assistant",content:reply}];
        setMsgs(updated);
        save({chatHistory:updated.slice(-20)});
      } catch {} finally { setLoading(false); }
    };

    return (
      <div style={{padding:"16px 16px 0",display:"flex",flexDirection:"column",height:"calc(100vh - 140px)"}}>
        <div style={{...card,background:"linear-gradient(135deg,#0d0a1a,#0f0f0f)",border:`1px solid #7c3aed44`,marginBottom:8,padding:"12px 14px"}}>
          <div style={{fontSize:10,color:"#a78bfa",letterSpacing:2,textTransform:"uppercase"}}>🔮 The Oracle of FitQuest</div>
          <div style={{fontSize:11,color:C.muted,marginTop:3}}>Ancient keeper of Eiraya's destiny · Kingdom: {kingdom.name}</div>
        </div>
        <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:10,flexShrink:0}}>
          {quickPrompts.map((q,i)=><button key={i} style={{...btn("ghost"),fontSize:11,padding:"7px 12px",whiteSpace:"nowrap",flexShrink:0,border:`1px solid #7c3aed44`}} onClick={()=>send(q.text)}>{q.label}</button>)}
        </div>
        <div style={{flex:1,overflowY:"auto",marginBottom:12,paddingRight:4}}>
          {msgs.length===0&&(
            <div style={{textAlign:"center",paddingTop:30}}>
              <div style={{fontSize:52}}>🔮</div>
              <div style={{fontSize:17,fontWeight:700,color:"#a78bfa",marginTop:10}}>The Oracle Awaits</div>
              <div style={{fontSize:12,color:C.muted,marginTop:8,lineHeight:1.7,padding:"0 20px",fontStyle:"italic"}}>"I have watched a thousand warriors walk this path, Eiraya. Most turned back. You are still here. That already makes you different."</div>
            </div>
          )}
          {msgs.map((m,i)=>(
            <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start",marginBottom:10,alignItems:"flex-end",gap:6}}>
              {m.role==="assistant"&&<span style={{fontSize:18,flexShrink:0}}>🔮</span>}
              <div style={{maxWidth:"82%",background:m.role==="user"?C.gold:"#16103a",color:m.role==="user"?"#000":C.text,padding:"10px 14px",borderRadius:m.role==="user"?"14px 14px 4px 14px":"14px 14px 14px 4px",fontSize:13,lineHeight:1.7,border:m.role==="assistant"?`1px solid #7c3aed44`:"none",whiteSpace:"pre-wrap",fontWeight:m.role==="user"?600:400}}>
                {m.content}
              </div>
            </div>
          ))}
          {loading&&<div style={{display:"flex",gap:6,alignItems:"flex-end",marginBottom:10}}><span style={{fontSize:18}}>🔮</span><div style={{background:"#16103a",border:`1px solid #7c3aed44`,borderRadius:"14px 14px 14px 4px",padding:"10px 14px",fontSize:13,color:"#a78bfa",fontStyle:"italic"}}>The Oracle reads the stars...</div></div>}
          <div ref={endRef}/>
        </div>
        <div style={{display:"flex",gap:8,paddingBottom:16,flexShrink:0}}>
          <input style={{...inp,flex:1}} placeholder="Speak to the Oracle..." value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send(input)}/>
          <button style={{...btn("purple"),padding:"10px 18px"}} onClick={()=>send(input)}>Send</button>
        </div>
      </div>
    );
  };


  const TABS = [
    {id:"realm",    icon:"⚔️", label:"Realm"  },
    {id:"journey",  icon:"🚂", label:"Journey"},
    {id:"workout",  icon:"💪", label:"Battle" },
    {id:"meals",    icon:"🍽️", label:"Feast"  },
    {id:"mind",     icon:"🧠", label:"Mind"   },
    {id:"hourglass",icon:"⌛", label:"Hours"  },
    {id:"inv",      icon:"🎒", label:"Inv"    },
    {id:"oracle",   icon:"🔮", label:"Oracle" },
  ];

  return (
    <div style={{background:C.bg,minHeight:"100vh",color:C.text,fontFamily:"system-ui,-apple-system,sans-serif"}}>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:3px;height:3px;}
        ::-webkit-scrollbar-thumb{background:#333;border-radius:2px;}
        input[type=range]{-webkit-appearance:none;height:4px;background:#1a1a1a;border-radius:2px;outline:none;}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:20px;height:20px;background:#f59e0b;border-radius:50%;cursor:pointer;}
        textarea{outline:none;}
      `}</style>

      {/* Header */}
      <div style={{padding:"12px 16px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,background:C.bg,zIndex:10}}>
        <div>
          <div style={{fontSize:18,fontWeight:900,background:`linear-gradient(90deg, ${kingdom.accent}, ${C.goldLight})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",letterSpacing:"-0.5px"}}>⚔️ FITQUEST</div>
          <div style={{fontSize:9,color:C.muted,marginTop:1,letterSpacing:2,textTransform:"uppercase"}}>Eiraya · {kingdom.name}</div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:11,color:C.muted}}>LVL <span style={{color:kingdom.accent,fontWeight:800,fontSize:16}}>{level}</span> · <span style={{color:C.gold}}>{data.xp.toLocaleString()} XP</span></div>
          <div style={{fontSize:11,color:C.muted,marginTop:1}}>{data.streak}🔥 · {data.streakMultiplier}× mult</div>
        </div>
      </div>

      <div style={{paddingBottom:76}}>
        {tab==="realm"      && <RealmTab/>}
        {tab==="journey"    && <JourneyTab/>}
        {tab==="workout"    && <WorkoutTab/>}
        {tab==="meals"      && <MealsTab/>}
        {tab==="mind"       && <MindTab/>}
        {tab==="hourglass"  && <HourglassTab/>}
        {tab==="inv"        && <InventoryTab/>}
        {tab==="oracle"     && <OracleTab/>}
      </div>

      {/* Bottom Nav */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,background:"#050505",borderTop:`1px solid ${C.border}`,display:"flex",justifyContent:"space-around",padding:"6px 0 10px",zIndex:10}}>
        {TABS.map(t=>(
          <button key={t.id} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:1,background:"none",border:"none",cursor:"pointer",color:tab===t.id?kingdom.accent:C.muted,padding:"3px 6px",transition:"color 0.2s"}} onClick={()=>setTab(t.id)}>
            <span style={{fontSize:18,filter:tab===t.id?"none":"grayscale(0.6)",transition:"filter 0.2s"}}>{t.icon}</span>
            <span style={{fontSize:8,fontWeight:tab===t.id?700:400,letterSpacing:0.5}}>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
