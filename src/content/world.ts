export type Portal = {
  id: string;
  number: string;
  title: string;
  caption: string;
  theme: 'rose' | 'cream' | 'lilac';
  symbol: 'heart' | 'star' | 'ribbon';
  intro: string;
  message: string;
  experience?: 'sweet-match' | 'avocado-quiz' | 'petal-race';
  doorArt: string;
};

// Временные темы для визуального прототипа. Личные истории добавим отдельно.
export const portals: Portal[] = [
  { id: 'little-moments', number: '01', title: 'Ближе к сердцу', caption: 'Маленькие моменты. Большие чувства.', theme: 'rose', symbol: 'heart', intro: 'У всего самого тёплого есть своя история.', message: 'Есть мгновения, которые хочется бережно складывать в карман. Чтобы однажды достать — и снова улыбнуться. Эта комната пока хранит свой секрет.', experience: 'sweet-match', doorArt: 'portals/portal-sweets.png?v=equal-6' },
  { id: 'little-magic', number: '02', title: 'Немного чудес', caption: 'Место, где можно побыть ребёнком.', theme: 'cream', symbol: 'star', intro: 'Некоторые чудеса начинаются с любопытства.', message: 'Чуть-чуть любопытства, капелька удачи и готовность удивляться. Всё остальное найдётся по дороге. Маленькое приключение ещё готовится.', experience: 'avocado-quiz', doorArt: 'portals/portal-cream.png?v=equal-6' },
  { id: 'something-ahead', number: '03', title: 'Розовый гран-при', caption: 'Твои самые преданные болельщики.', theme: 'lilac', symbol: 'ribbon', intro: '', message: '', experience: 'petal-race', doorArt: 'portals/portal-race.png?v=equal-8' },
];

export const asset = (name: string) => `${import.meta.env.BASE_URL}art/${name}`;
