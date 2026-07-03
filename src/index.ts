import {
	World,
	createSystem,
	PanelUI,
	PanelDocument,
	UIKitDocument,
	UIKit,
	Follower,
	ScreenSpace,
	eq,
	InputComponent,
	Object3D,
} from '@iwsdk/core';
import {
	Mesh,
	MeshBasicMaterial,
	LineBasicMaterial,
	BufferGeometry,
	Float32BufferAttribute,
	Group,
	Color,
	Vector3,
	FogExp2,
	AmbientLight,
	DirectionalLight,
	PointLight,
	GridHelper,
	EdgesGeometry,
	LineSegments,
	Points,
	PointsMaterial,
	AdditiveBlending,
	BoxGeometry,
	SphereGeometry,
	OctahedronGeometry,
	TorusGeometry,
	IcosahedronGeometry,
} from '@iwsdk/core';

// ============================================================
// TYPES
// ============================================================

interface TriviaQuestion {
	category: number;
	difficulty: 'easy' | 'medium' | 'hard';
	question: string;
	answers: [string, string, string, string];
	correct: number;
	hint: string;
}

interface GameStats {
	gamesPlayed: number;
	totalScore: number;
	bestScore: number;
	correctAnswers: number;
	totalAnswers: number;
	bestStreak: number;
	lifelinesUsed: number;
	dailyStreak: number;
	lastDailyDate: string;
	level: number;
	xp: number;
	categoryGames: number[];
	categoryCorrect: number[];
	categoryTotal: number[];
}

interface LeaderboardEntry {
	name: string;
	score: number;
	mode: string;
	date: string;
}

interface AchDef {
	name: string;
	desc: string;
	check: (s: GameStats, g: GameState) => boolean;
}

type GameMode = 'classic' | 'speed' | 'streak' | 'category' | 'daily' | 'blitz' | 'marathon' | 'practice';
type Difficulty = 'easy' | 'medium' | 'hard';
type Screen = 'title' | 'modeselect' | 'catpick' | 'difficulty' | 'countdown' | 'playing' | 'pause' | 'gameover' | 'achvlist' | 'stats' | 'settings' | 'leaderboard' | 'help' | 'review';

interface GameState {
	mode: GameMode;
	difficulty: Difficulty;
	category: number;
	questions: TriviaQuestion[];
	currentIndex: number;
	score: number;
	correctCount: number;
	totalAnswered: number;
	combo: number;
	bestCombo: number;
	streak: number;
	bestStreak: number;
	lifelines: { fifty: boolean; skip: boolean; hint: boolean };
	timer: number;
	maxTimer: number;
	eliminated: number[];
	doublePoints: number;
	timeFrozen: boolean;
	hasDouble: boolean;
	hasFreeze: boolean;
	results: (boolean | undefined)[];
	gameStartTime: number;
	elapsedTime: number;
	xpGained: number;
}

// ============================================================
// CONSTANTS
// ============================================================

const CATEGORIES = [
	'Science', 'History', 'Geography', 'Entertainment', 'Sports',
	'Technology', 'Nature', 'Food & Drink', 'Arts & Culture', 'General Knowledge',
];

const THEMES = [
	{ name: 'HOLODECK', primary: 0x00ffff, secondary: 0x004455, bg: 0x000811, fog: 0x000811 },
	{ name: 'CRIMSON', primary: 0xff0044, secondary: 0x440011, bg: 0x110000, fog: 0x110000 },
	{ name: 'TOXIC', primary: 0x00ff44, secondary: 0x004411, bg: 0x001100, fog: 0x001100 },
	{ name: 'ULTRAVIOLET', primary: 0xaa00ff, secondary: 0x330044, bg: 0x0a000f, fog: 0x0a000f },
	{ name: 'SOLAR', primary: 0xff8800, secondary: 0x442200, bg: 0x110800, fog: 0x110800 },
	{ name: 'ARCTIC', primary: 0xccffff, secondary: 0x446688, bg: 0x0a0a12, fog: 0x0a0a12 },
];

const MODE_QUESTION_COUNT: Record<GameMode, number> = {
	classic: 20, speed: 999, streak: 999, category: 20,
	daily: 20, blitz: 999, marathon: 50, practice: 20,
};

const DIFF_TIMERS: Record<Difficulty, number> = { easy: 30, medium: 20, hard: 15 };

const PANEL_CONFIGS: Record<string, { config: string; y: number; z: number }> = {
	title: { config: './ui/title.json', y: 0.1, z: -1.5 },
	modeselect: { config: './ui/modeselect.json', y: 0.1, z: -1.5 },
	catpick: { config: './ui/catpick.json', y: 0.1, z: -1.5 },
	difficulty: { config: './ui/difficulty.json', y: 0.1, z: -1.5 },
	question: { config: './ui/question.json', y: 0.35, z: -1.3 },
	answers: { config: './ui/answers.json', y: -0.15, z: -1.3 },
	hud: { config: './ui/hud.json', y: 0.6, z: -0.9 },
	pause: { config: './ui/pause.json', y: 0.1, z: -1.2 },
	gameover: { config: './ui/gameover.json', y: 0.1, z: -1.5 },
	achvlist: { config: './ui/achvlist.json', y: 0.1, z: -1.5 },
	stats: { config: './ui/stats.json', y: 0.1, z: -1.5 },
	settings: { config: './ui/settings.json', y: 0.1, z: -1.5 },
	leaderboard: { config: './ui/leaderboard.json', y: 0.1, z: -1.5 },
	countdown: { config: './ui/countdown.json', y: 0.2, z: -1.0 },
	toast: { config: './ui/toast.json', y: 0.45, z: -1.0 },
	help: { config: './ui/help.json', y: 0.1, z: -1.5 },
};

// ============================================================
// QUESTION BANK — 210 questions (21 per category)
// ============================================================

function qb(c: number, d: 'easy' | 'medium' | 'hard', text: string, a: [string, string, string, string], r: number, h: string): TriviaQuestion {
	return { category: c, difficulty: d, question: text, answers: a, correct: r, hint: h };
}

const QUESTIONS: TriviaQuestion[] = [
	// ---- 0: Science ----
	qb(0,'easy','What planet is closest to the Sun?',['Mercury','Venus','Mars','Earth'],0,'Named after a Roman messenger god'),
	qb(0,'easy','What gas do plants absorb from the atmosphere?',['Carbon dioxide','Oxygen','Nitrogen','Hydrogen'],0,'Chemical formula CO2'),
	qb(0,'easy','How many bones are in the adult human body?',['206','208','196','212'],0,'Just over two hundred'),
	qb(0,'easy','What is the chemical symbol for water?',['H2O','CO2','NaCl','O2'],0,'Two hydrogen, one oxygen'),
	qb(0,'easy','What force keeps us on the ground?',['Gravity','Magnetism','Friction','Inertia'],0,'Newton and an apple'),
	qb(0,'medium','What is the powerhouse of the cell?',['Mitochondria','Nucleus','Ribosome','Golgi body'],0,'Produces ATP energy'),
	qb(0,'medium','What element has atomic number 79?',['Gold','Silver','Platinum','Copper'],0,'Symbol is Au'),
	qb(0,'medium','Speed of light in km/s (approx)?',['300,000','150,000','500,000','1,000,000'],0,'About 3 × 10^5'),
	qb(0,'medium','Which planet has the most moons?',['Saturn','Jupiter','Uranus','Neptune'],0,'Ringed planet surpassed Jupiter'),
	qb(0,'medium','What particle has a positive charge?',['Proton','Electron','Neutron','Photon'],0,'Found in the nucleus'),
	qb(0,'hard','What is the half-life of Carbon-14?',['5,730 years','1,000 years','10,000 years','50,000 years'],0,'Used in radiocarbon dating'),
	qb(0,'hard','Which subatomic particle was predicted by Dirac?',['Positron','Neutrino','Quark','Muon'],0,'Antiparticle of the electron'),
	qb(0,'easy','What is the largest organ in the human body?',['Skin','Liver','Brain','Heart'],0,'Covers your entire body'),
	qb(0,'medium','What does DNA stand for?',['Deoxyribonucleic acid','Dinitrogen acid','Dynamic nuclear acid','Dual nitrogen acid'],0,'The blueprint of life'),
	qb(0,'medium','Which blood type is a universal donor?',['O negative','AB positive','A positive','B negative'],0,'Letter before P, negative'),
	qb(0,'hard','What is the Chandrasekhar limit?',['1.4 solar masses','2.0 solar masses','0.5 solar masses','3.0 solar masses'],0,'Max mass of a white dwarf'),
	qb(0,'easy','Boiling point of water in Celsius?',['100','90','110','212'],0,'Also 212 Fahrenheit'),
	qb(0,'hard','Most abundant element in the universe?',['Hydrogen','Helium','Oxygen','Carbon'],0,'Simplest element, number 1'),
	qb(0,'medium','Which vitamin is produced from sunlight?',['Vitamin D','Vitamin C','Vitamin A','Vitamin B12'],0,'The sunshine vitamin'),
	qb(0,'hard','What phenomenon causes stars to appear to shift position?',['Parallax','Diffraction','Refraction','Aberration'],0,'Used to measure stellar distances'),
	qb(0,'hard','What is the Schwarzschild radius related to?',['Black holes','Neutron stars','White dwarfs','Red giants'],0,'Event horizon boundary'),

	// ---- 1: History ----
	qb(1,'easy','In which year did World War II end?',['1945','1944','1946','1943'],0,'Same year as the atomic bombs'),
	qb(1,'easy','First President of the United States?',['George Washington','John Adams','Thomas Jefferson','Benjamin Franklin'],0,'Face on the one-dollar bill'),
	qb(1,'easy','Which ancient civilization built the pyramids?',['Egyptians','Romans','Greeks','Persians'],0,'Along the Nile River'),
	qb(1,'easy','What ship sank in 1912 after hitting an iceberg?',['Titanic','Lusitania','Britannic','Olympic'],0,'Called unsinkable'),
	qb(1,'medium','Who painted the Sistine Chapel ceiling?',['Michelangelo','Leonardo da Vinci','Raphael','Donatello'],0,'Also sculpted David'),
	qb(1,'medium','Which empire was ruled by Genghis Khan?',['Mongol Empire','Ottoman Empire','Roman Empire','Persian Empire'],0,'Largest contiguous land empire'),
	qb(1,'medium','In what year did the Berlin Wall fall?',['1989','1991','1987','1990'],0,'November, end of the 1980s'),
	qb(1,'medium','Who was the last pharaoh of Egypt?',['Cleopatra VII','Nefertiti','Hatshepsut','Ramesses II'],0,'Famous for Caesar and Antony'),
	qb(1,'hard','What did the Treaty of Westphalia (1648) end?',['Thirty Years War','WWI','Hundred Years War','Napoleonic Wars'],0,'Established national sovereignty'),
	qb(1,'hard','Turning point battle of the US Civil War?',['Gettysburg','Antietam','Bull Run','Vicksburg'],0,'Three-day battle in Pennsylvania'),
	qb(1,'easy','Who discovered America in 1492?',['Christopher Columbus','Leif Erikson','Amerigo Vespucci','Ferdinand Magellan'],0,'Sailed from Spain'),
	qb(1,'medium','First satellite launched into space?',['Sputnik','Explorer','Vostok','Apollo'],0,'Soviet Union, 1957'),
	qb(1,'medium','Which revolution began in 1789?',['French Revolution','American Revolution','Russian Revolution','Industrial Revolution'],0,'Storming of the Bastille'),
	qb(1,'hard','What was the Magna Carta?',['A charter of rights','A peace treaty','A trade agreement','A religious text'],0,'Signed 1215 by King John'),
	qb(1,'easy','Who was the Maid of Orleans?',['Joan of Arc','Marie Antoinette','Queen Victoria','Catherine the Great'],0,'French heroine'),
	qb(1,'hard','The Rosetta Stone helped decode which writing?',['Egyptian hieroglyphs','Sumerian cuneiform','Mayan glyphs','Sanskrit'],0,'Found by Napoleon\'s soldiers'),
	qb(1,'medium','Which country was formerly Persia?',['Iran','Iraq','Turkey','Afghanistan'],0,'Changed name in 1935'),
	qb(1,'easy','Ancient wonder in Alexandria, Egypt?',['The Lighthouse','The Colossus','Hanging Gardens','The Mausoleum'],0,'Also called the Pharos'),
	qb(1,'hard','First Emperor of Rome?',['Augustus','Julius Caesar','Nero','Caligula'],0,'Born Gaius Octavius'),
	qb(1,'medium','Year humans first landed on the Moon?',['1969','1968','1970','1971'],0,'Apollo 11'),
	qb(1,'hard','Hundred Years War was between which countries?',['England and France','Spain and Portugal','Germany and Austria','Italy and Greece'],0,'Actually 116 years'),

	// ---- 2: Geography ----
	qb(2,'easy','What is the largest continent?',['Asia','Africa','North America','Europe'],0,'Over 4 billion people'),
	qb(2,'easy','Longest river in the world?',['Nile','Amazon','Yangtze','Mississippi'],0,'Flows through NE Africa'),
	qb(2,'easy','Country with the largest population?',['India','China','USA','Indonesia'],0,'Surpassed China recently'),
	qb(2,'easy','Smallest country in the world?',['Vatican City','Monaco','San Marino','Liechtenstein'],0,'Home of the Pope'),
	qb(2,'medium','Capital of Australia?',['Canberra','Sydney','Melbourne','Brisbane'],0,'Not the largest city'),
	qb(2,'medium','Largest hot desert?',['Sahara','Arabian','Gobi','Kalahari'],0,'Covers much of North Africa'),
	qb(2,'medium','Mount Everest is in which mountain range?',['Himalayas','Andes','Alps','Rockies'],0,'Nepal-Tibet border'),
	qb(2,'medium','Country with the most islands?',['Sweden','Indonesia','Philippines','Japan'],0,'Over 267,000 islands'),
	qb(2,'hard','Deepest point in the ocean?',['Mariana Trench','Tonga Trench','Java Trench','Puerto Rico Trench'],0,'Challenger Deep, Pacific'),
	qb(2,'hard','African country with the most pyramids?',['Sudan','Egypt','Ethiopia','Libya'],0,'More than its northern neighbor'),
	qb(2,'easy','Largest ocean?',['Pacific','Atlantic','Indian','Arctic'],0,'Covers more than all land combined'),
	qb(2,'medium','Capital of Canada?',['Ottawa','Toronto','Montreal','Vancouver'],0,'In Ontario'),
	qb(2,'easy','Driest continent?',['Antarctica','Africa','Australia','Asia'],0,'A frozen desert'),
	qb(2,'hard','Country with the longest coastline?',['Canada','Indonesia','Norway','Australia'],0,'Over 200,000 km'),
	qb(2,'medium','Danube River flows through how many countries?',['10','7','12','5'],0,'Germany to Black Sea'),
	qb(2,'hard','Only country spanning four hemispheres?',['Kiribati','Ecuador','Colombia','Brazil'],0,'Pacific island nation'),
	qb(2,'easy','Capital of Japan?',['Tokyo','Osaka','Kyoto','Yokohama'],0,'Largest metro area'),
	qb(2,'medium','Lake Baikal is in which country?',['Russia','Mongolia','China','Kazakhstan'],0,'In Siberia'),
	qb(2,'hard','Highest waterfall in the world?',['Angel Falls','Niagara Falls','Victoria Falls','Iguazu Falls'],0,'In Venezuela, 979m'),
	qb(2,'medium','Strait separating Europe from Africa?',['Strait of Gibraltar','Bosphorus','Strait of Hormuz','Strait of Malacca'],0,'Only 14 km wide'),
	qb(2,'hard','Largest island in the Mediterranean?',['Sicily','Sardinia','Corsica','Crete'],0,'Part of Italy'),

	// ---- 3: Entertainment ----
	qb(3,'easy','Who played Jack in Titanic?',['Leonardo DiCaprio','Brad Pitt','Tom Cruise','Johnny Depp'],0,'Also in Inception'),
	qb(3,'easy','Harry Potter\'s owl?',['Hedwig','Errol','Pigwidgeon','Scabbers'],0,'A snowy white owl'),
	qb(3,'easy','Band that sang Bohemian Rhapsody?',['Queen','The Beatles','Led Zeppelin','Pink Floyd'],0,'Freddie Mercury'),
	qb(3,'easy','What color is Pikachu?',['Yellow','Red','Blue','Green'],0,'Electric-type Pokemon'),
	qb(3,'medium','Who directed Jurassic Park?',['Steven Spielberg','James Cameron','George Lucas','Ridley Scott'],0,'Also directed Schindler\'s List'),
	qb(3,'medium','Black Panther\'s fictional country?',['Wakanda','Zamunda','Genovia','Latveria'],0,'Rich in vibranium'),
	qb(3,'medium','TV show with dragons and Iron Throne?',['Game of Thrones','Lord of the Rings','The Witcher','Vikings'],0,'By George R.R. Martin'),
	qb(3,'medium','Who wrote Lord of the Rings?',['J.R.R. Tolkien','C.S. Lewis','J.K. Rowling','George R.R. Martin'],0,'Oxford professor'),
	qb(3,'hard','First Star Wars film release year?',['1977','1979','1980','1975'],0,'Episode IV: A New Hope'),
	qb(3,'hard','Who composed the Inception score?',['Hans Zimmer','John Williams','Howard Shore','James Horner'],0,'German composer'),
	qb(3,'easy','Lion King protagonist?',['Simba','Mufasa','Scar','Nala'],0,'Means lion in Swahili'),
	qb(3,'medium','Who painted the Mona Lisa?',['Leonardo da Vinci','Michelangelo','Raphael','Rembrandt'],0,'Renaissance polymath'),
	qb(3,'easy','Superman\'s weakness?',['Kryptonite','Fire','Water','Silver'],0,'Green mineral from his planet'),
	qb(3,'hard','First feature-length animated film?',['Snow White','Fantasia','Pinocchio','Bambi'],0,'Disney, 1937'),
	qb(3,'medium','Video game with plumber Mario?',['Super Mario Bros','Donkey Kong','Pac-Man','Tetris'],0,'Red and blue outfit'),
	qb(3,'hard','Who played Joker in The Dark Knight?',['Heath Ledger','Jack Nicholson','Jared Leto','Joaquin Phoenix'],0,'Posthumous Oscar'),
	qb(3,'medium','Detective at 221B Baker Street?',['Sherlock Holmes','Hercule Poirot','Philip Marlowe','Miss Marple'],0,'By Arthur Conan Doyle'),
	qb(3,'easy','What type of fish is Nemo?',['Clownfish','Goldfish','Angelfish','Swordfish'],0,'Orange and white'),
	qb(3,'hard','Studio Ghibli film with a bathhouse?',['Spirited Away','My Neighbor Totoro','Princess Mononoke','Howl\'s Moving Castle'],0,'Won Best Animated Feature'),
	qb(3,'medium','Highest-grossing film of all time?',['Avatar','Avengers: Endgame','Titanic','Star Wars'],0,'James Cameron, blue aliens'),
	qb(3,'hard','Creator of Sherlock Holmes?',['Arthur Conan Doyle','Agatha Christie','Edgar Allan Poe','Charles Dickens'],0,'Scottish physician'),

	// ---- 4: Sports ----
	qb(4,'easy','Players on a soccer team (on field)?',['11','10','12','9'],0,'Same as cricket'),
	qb(4,'easy','Sport with racket and shuttlecock?',['Badminton','Tennis','Squash','Table Tennis'],0,'The birdie'),
	qb(4,'easy','Country that hosted 2016 Olympics?',['Brazil','China','UK','Japan'],0,'Rio de Janeiro'),
	qb(4,'easy','Points for a touchdown in American football?',['6','7','3','4'],0,'Plus extra point kick'),
	qb(4,'medium','Most Grand Slam tennis titles (men)?',['Novak Djokovic','Roger Federer','Rafael Nadal','Pete Sampras'],0,'Serbian player'),
	qb(4,'medium','Basketball hoop diameter in inches?',['18','16','20','15'],0,'Double the ball diameter'),
	qb(4,'medium','Year of first modern Olympics?',['1896','1900','1880','1912'],0,'In Athens, Greece'),
	qb(4,'medium','Most FIFA World Cup wins?',['Brazil','Germany','Italy','Argentina'],0,'Five titles'),
	qb(4,'hard','Oldest Grand Slam tournament?',['Wimbledon','US Open','French Open','Australian Open'],0,'Grass courts, London, 1877'),
	qb(4,'hard','Most Olympic gold medals ever?',['Michael Phelps','Usain Bolt','Carl Lewis','Mark Spitz'],0,'Swimmer, 23 golds'),
	qb(4,'easy','Sport played at Wimbledon?',['Tennis','Cricket','Golf','Polo'],0,'Grass courts and strawberries'),
	qb(4,'medium','Olympic pool length in meters?',['50','25','100','75'],0,'Half of 100'),
	qb(4,'easy','Color of middle Olympic ring?',['Black','Blue','Red','Green'],0,'The only non-colored ring'),
	qb(4,'hard','Sport with a Fosbury Flop?',['High Jump','Long Jump','Pole Vault','Triple Jump'],0,'Going over the bar backwards'),
	qb(4,'medium','Perfect score in bowling?',['300','350','250','400'],0,'12 strikes'),
	qb(4,'hard','Country that invented cricket?',['England','India','Australia','South Africa'],0,'16th century'),
	qb(4,'medium','Holes in a round of golf?',['18','9','12','36'],0,'Two nines'),
	qb(4,'easy','What sport does LeBron James play?',['Basketball','Football','Baseball','Soccer'],0,'Lakers and Cavaliers'),
	qb(4,'hard','Ryder Cup is which sport?',['Golf','Sailing','Cricket','Rugby'],0,'Europe vs USA'),
	qb(4,'medium','Periods in an ice hockey game?',['3','4','2','5'],0,'20 minutes each'),
	qb(4,'hard','Martial art added to Olympics in 2021?',['Karate','Taekwondo','Judo','Kung Fu'],0,'Tokyo Olympics, kata and kumite'),

	// ---- 5: Technology ----
	qb(5,'easy','What does WWW stand for?',['World Wide Web','Wide World Web','Web World Wide','World Web Wide'],0,'Tim Berners-Lee'),
	qb(5,'easy','Company that created the iPhone?',['Apple','Samsung','Google','Microsoft'],0,'Founded by Steve Jobs'),
	qb(5,'easy','What does CPU stand for?',['Central Processing Unit','Core Power Unit','Central Power Unit','Computer Processing Unit'],0,'The brain of the computer'),
	qb(5,'easy','Programming language named after coffee?',['Java','Python','Ruby','Go'],0,'Logo is a coffee cup'),
	qb(5,'medium','Year the World Wide Web was invented?',['1989','1991','1985','1993'],0,'By Tim Berners-Lee at CERN'),
	qb(5,'medium','What does HTML stand for?',['HyperText Markup Language','High Tech Modern Language','HyperTool Markup Language','Home Tool Markup Language'],0,'Standard web page language'),
	qb(5,'medium','First commercially successful smartphone?',['iPhone','BlackBerry','Nokia N95','Palm Treo'],0,'Apple, 2007'),
	qb(5,'medium','What does GPU stand for?',['Graphics Processing Unit','General Processing Unit','Graphics Power Unit','Game Processing Unit'],0,'Essential for gaming and AI'),
	qb(5,'hard','Father of computer science?',['Alan Turing','Charles Babbage','John von Neumann','Ada Lovelace'],0,'Broke the Enigma code'),
	qb(5,'hard','First computer virus?',['Creeper','ILOVEYOU','Melissa','Brain'],0,'ARPANET, 1971'),
	qb(5,'easy','What does USB stand for?',['Universal Serial Bus','United System Bus','Ultra Speed Bus','Universal System Base'],0,'Common connector'),
	qb(5,'medium','Language created by Guido van Rossum?',['Python','Java','Ruby','Perl'],0,'Named after a comedy troupe'),
	qb(5,'hard','Year of the first email?',['1971','1969','1975','1980'],0,'Ray Tomlinson, ARPANET'),
	qb(5,'easy','What does WiFi stand for?',['Wireless Fidelity','Wide Field','Wire Free','Wireless Frequency'],0,'Actually a brand name'),
	qb(5,'medium','Moore\'s Law is about?',['Transistor density doubling','Internet speed','Battery life','Screen resolution'],0,'Approximately every two years'),
	qb(5,'hard','CRISPR stands for?',['Clustered Regularly Interspaced Short Palindromic Repeats','Central Regulatory Information System','Chromosomal Recombination Protocol','Cellular RNA Integration Sequence'],0,'Gene editing tool'),
	qb(5,'medium','Company behind Android?',['Google','Apple','Samsung','Microsoft'],0,'Originally Android Inc'),
	qb(5,'hard','First graphical web browser?',['Mosaic','Netscape','Internet Explorer','Firefox'],0,'1993, NCSA'),
	qb(5,'easy','What does AI stand for?',['Artificial Intelligence','Automated Information','Advanced Interface','Analog Integration'],0,'Machines that think'),
	qb(5,'medium','Most popular version control system?',['Git','SVN','Mercurial','Perforce'],0,'By Linus Torvalds'),
	qb(5,'hard','Quantum computing concept with linked particles?',['Entanglement','Superposition','Decoherence','Tunneling'],0,'Spooky action at a distance'),

	// ---- 6: Nature ----
	qb(6,'easy','Largest animal on Earth?',['Blue whale','Elephant','Giraffe','Great white shark'],0,'Over 100 feet long'),
	qb(6,'easy','How many legs does a spider have?',['8','6','10','12'],0,'Two more than insects'),
	qb(6,'easy','Tallest type of tree?',['Redwood','Oak','Pine','Maple'],0,'In California, over 350 feet'),
	qb(6,'easy','What do caterpillars turn into?',['Butterflies','Beetles','Bees','Dragonflies'],0,'Metamorphosis'),
	qb(6,'medium','Fastest land animal?',['Cheetah','Lion','Gazelle','Horse'],0,'70 mph in short bursts'),
	qb(6,'medium','Animal with the longest lifespan?',['Greenland shark','Tortoise','Elephant','Whale'],0,'Over 400 years'),
	qb(6,'medium','Largest flower in the world?',['Rafflesia','Sunflower','Titan arum','Lotus'],0,'SE Asia, smells terrible'),
	qb(6,'medium','Which bird can fly backwards?',['Hummingbird','Kingfisher','Swift','Sparrow'],0,'Smallest birds'),
	qb(6,'hard','Only mammal that can truly fly?',['Bat','Flying squirrel','Sugar glider','Colugo'],0,'Webbed wings, not gliding'),
	qb(6,'hard','Most venomous snake?',['Inland taipan','King cobra','Black mamba','Eastern diamondback'],0,'Australia, the fierce snake'),
	qb(6,'easy','Group of wolves is called a?',['Pack','Herd','Flock','School'],0,'Led by an alpha'),
	qb(6,'medium','How many hearts does an octopus have?',['3','2','4','1'],0,'Two for gills, one for body'),
	qb(6,'easy','What type of animal is a dolphin?',['Mammal','Fish','Reptile','Amphibian'],0,'Breathes air, nurses young'),
	qb(6,'hard','Largest living organism on Earth?',['Honey fungus','Blue whale','Giant sequoia','Aspen grove'],0,'Armillaria, fungal network in Oregon'),
	qb(6,'medium','Animal that sleeps the most?',['Koala','Cat','Sloth','Lion'],0,'Up to 22 hours in eucalyptus'),
	qb(6,'hard','What is bioluminescence?',['Light produced by organisms','Sound by animals','Heat from insects','Electricity from eels'],0,'Fireflies and deep-sea creatures'),
	qb(6,'easy','Largest species of bear?',['Polar bear','Grizzly bear','Brown bear','Kodiak bear'],0,'Lives in the Arctic'),
	qb(6,'medium','How do camel humps help survival?',['Store fat for energy','Store water','Extra lungs','Thick insulation'],0,'Fat metabolized for energy'),
	qb(6,'hard','What is mycorrhiza?',['Fungus-root symbiosis','A type of moss','A tree disease','An insect species'],0,'Helps absorb nutrients'),
	qb(6,'medium','Best sense of smell?',['Bear','Dog','Shark','Elephant'],0,'Detects food from 20 miles'),
	qb(6,'hard','What % of Earth\'s species live in the ocean?',['80%','50%','60%','70%'],0,'Most remain undiscovered'),

	// ---- 7: Food & Drink ----
	qb(7,'easy','Fruit on Hawaiian pizza?',['Pineapple','Mango','Papaya','Banana'],0,'Controversial, invented in Canada'),
	qb(7,'easy','Country sushi is from?',['Japan','China','Korea','Thailand'],0,'Vinegared rice with seafood'),
	qb(7,'easy','Main ingredient in guacamole?',['Avocado','Tomato','Pepper','Onion'],0,'Green fruit, alligator pear'),
	qb(7,'easy','Pasta shaped like a bow tie?',['Farfalle','Penne','Fusilli','Rigatoni'],0,'Italian for butterflies'),
	qb(7,'medium','Spice that gives curry its yellow color?',['Turmeric','Saffron','Paprika','Cumin'],0,'Also used in medicine'),
	qb(7,'medium','Most consumed beverage after water?',['Tea','Coffee','Beer','Milk'],0,'Popular in Asia and UK'),
	qb(7,'medium','Country producing the most coffee?',['Brazil','Colombia','Ethiopia','Vietnam'],0,'South America, Portuguese-speaking'),
	qb(7,'medium','Hottest chili pepper (by Scoville)?',['Carolina Reaper','Ghost pepper','Habanero','Trinidad Scorpion'],0,'Over 2.2 million SHU'),
	qb(7,'hard','Most expensive spice by weight?',['Saffron','Vanilla','Cardamom','Cinnamon'],0,'From crocus flower stigmas'),
	qb(7,'hard','Fermentation process for kombucha?',['SCOBY fermentation','Yeast only','Lactic acid','Alcohol fermentation'],0,'Bacteria and Yeast culture'),
	qb(7,'easy','Bacon comes from which animal?',['Pig','Cow','Chicken','Turkey'],0,'Also ham and pork chops'),
	qb(7,'medium','Primary grain in sake?',['Rice','Wheat','Barley','Corn'],0,'Japanese rice wine'),
	qb(7,'easy','Most popular pizza topping?',['Pepperoni','Mushroom','Sausage','Onion'],0,'A type of spiced salami'),
	qb(7,'hard','French region famous for sparkling wine?',['Champagne','Burgundy','Bordeaux','Loire'],0,'Only bubbly from here earns the name'),
	qb(7,'medium','Marzipan is made from which nut?',['Almond','Cashew','Walnut','Pistachio'],0,'Also makes amaretto'),
	qb(7,'hard','What is umami?',['A savory taste','A cooking technique','A type of rice','A Japanese knife'],0,'Fifth basic taste, from glutamates'),
	qb(7,'medium','Cuisine with pad thai and tom yum?',['Thai','Vietnamese','Chinese','Japanese'],0,'Sweet, sour, salty, spicy'),
	qb(7,'easy','Yogurt is made from?',['Milk','Cream','Butter','Cheese'],0,'Fermented with bacteria'),
	qb(7,'hard','What is the Maillard reaction?',['Browning when heated','Fermentation of sugar','Freezing liquids','Rising of dough'],0,'Complex flavors in seared meat'),
	qb(7,'medium','Rice for traditional risotto?',['Arborio','Jasmine','Basmati','Brown'],0,'Short-grain, starchy'),
	qb(7,'hard','Country consuming most cheese per capita?',['Denmark','France','Italy','Switzerland'],0,'Over 28 kg per person per year'),

	// ---- 8: Arts & Culture ----
	qb(8,'easy','Instrument with 88 keys?',['Piano','Organ','Accordion','Harpsichord'],0,'Black and white keys'),
	qb(8,'easy','Who wrote Romeo and Juliet?',['Shakespeare','Dickens','Austen','Hemingway'],0,'The Bard of Avon'),
	qb(8,'easy','Dance that originated in Argentina?',['Tango','Samba','Waltz','Flamenco'],0,'A passionate partner dance'),
	qb(8,'easy','Mix red and blue to get?',['Purple','Green','Orange','Brown'],0,'A royal color'),
	qb(8,'medium','Who sculpted The Thinker?',['Rodin','Michelangelo','Donatello','Bernini'],0,'French sculptor, Auguste'),
	qb(8,'medium','Salvador Dali\'s art movement?',['Surrealism','Impressionism','Cubism','Pop Art'],0,'Melting clocks'),
	qb(8,'medium','What is origami?',['Japanese paper folding','Chinese calligraphy','Korean pottery','Flower arranging'],0,'Animals and shapes from paper'),
	qb(8,'medium','Who wrote the novel 1984?',['George Orwell','Aldous Huxley','Ray Bradbury','H.G. Wells'],0,'Big Brother is watching'),
	qb(8,'hard','Period between Baroque and Romantic?',['Classical','Renaissance','Medieval','Modern'],0,'Mozart and Haydn era'),
	qb(8,'hard','Who painted The Persistence of Memory?',['Salvador Dali','Pablo Picasso','Rene Magritte','Max Ernst'],0,'Spanish surrealist, melting clocks'),
	qb(8,'easy','Strings on a standard guitar?',['6','4','8','12'],0,'E-A-D-G-B-E tuning'),
	qb(8,'medium','New Testament primarily written in?',['Greek','Latin','Hebrew','Aramaic'],0,'Koine dialect'),
	qb(8,'easy','Who painted Starry Night?',['Vincent van Gogh','Claude Monet','Pablo Picasso','Edvard Munch'],0,'Dutch post-impressionist'),
	qb(8,'hard','Oldest known musical instrument?',['Bone flute','Drum','Harp','Lyre'],0,'German cave, 40,000+ years'),
	qb(8,'medium','Character who said "To be or not to be"?',['Hamlet','Macbeth','Othello','Lear'],0,'Prince of Denmark'),
	qb(8,'hard','Chiaroscuro in art is?',['Light and shadow contrast','A fresco type','A sculpting technique','A musical tempo'],0,'Used by Caravaggio'),
	qb(8,'medium','Japanese art of miniature trees?',['Bonsai','Ikebana','Origami','Kintsugi'],0,'Planted in a tray'),
	qb(8,'easy','Author of Harry Potter?',['J.K. Rowling','J.R.R. Tolkien','C.S. Lewis','Rick Riordan'],0,'Pen name Robert Galbraith'),
	qb(8,'hard','Civilization that created Linear B?',['Mycenaean','Egyptian','Sumerian','Phoenician'],0,'Deciphered in 1952'),
	qb(8,'medium','Who composed The Four Seasons?',['Vivaldi','Bach','Mozart','Beethoven'],0,'Italian Baroque, the Red Priest'),
	qb(8,'hard','Pentameter in poetry means?',['Five metrical feet per line','Five stanzas','Five syllables','Five rhymes'],0,'Iambic is most famous'),

	// ---- 9: General Knowledge ----
	qb(9,'easy','Days in a leap year?',['366','365','364','367'],0,'Extra day in February'),
	qb(9,'easy','Currency of Japan?',['Yen','Won','Yuan','Ringgit'],0,'Y-shaped symbol'),
	qb(9,'easy','How many continents?',['7','6','5','8'],0,'Including Antarctica'),
	qb(9,'easy','Shape with three sides?',['Triangle','Square','Pentagon','Hexagon'],0,'Simplest polygon'),
	qb(9,'medium','What does PhD stand for?',['Doctor of Philosophy','Professional High Degree','Public Health Doctorate','Post Higher Diploma'],0,'Highest academic degree'),
	qb(9,'medium','Most spoken language in the world?',['English','Mandarin','Spanish','Hindi'],0,'By total speakers including L2'),
	qb(9,'medium','Planet known as the Morning Star?',['Venus','Mercury','Mars','Jupiter'],0,'Brightest after Sun and Moon'),
	qb(9,'medium','Largest organ inside the body?',['Liver','Brain','Heart','Lungs'],0,'About 3 pounds, on the right'),
	qb(9,'hard','How many time zones does Russia span?',['11','9','12','8'],0,'The most of any country'),
	qb(9,'hard','Hardest natural substance?',['Diamond','Titanium','Tungsten','Sapphire'],0,'Carbon in crystal structure'),
	qb(9,'easy','Tallest animal on Earth?',['Giraffe','Elephant','Ostrich','Moose'],0,'Over 18 feet tall'),
	qb(9,'medium','Chemical symbol Ag is which metal?',['Silver','Gold','Platinum','Aluminum'],0,'Latin: argentum'),
	qb(9,'easy','Sides on a hexagon?',['6','5','8','7'],0,'Hex means six'),
	qb(9,'hard','Fibonacci sequence rule?',['Each number is sum of prior two','Doubling sequence','Prime numbers','Powers of two'],0,'0, 1, 1, 2, 3, 5, 8, 13...'),
	qb(9,'medium','Rarest blood group?',['AB negative','O negative','B negative','A negative'],0,'Less than 1% of population'),
	qb(9,'hard','What is a pangram?',['Sentence using every alphabet letter','A type of poem','A musical scale','A math formula'],0,'The quick brown fox...'),
	qb(9,'medium','Scale measuring earthquake intensity?',['Richter','Beaufort','Kelvin','Mohs'],0,'Logarithmic seismic scale'),
	qb(9,'easy','Zeros in one million?',['6','5','7','8'],0,'1 followed by six zeros'),
	qb(9,'hard','Golden ratio is approximately?',['1.618','2.718','3.141','1.414'],0,'Greek letter phi'),
	qb(9,'medium','Mixing all primary colors of light gives?',['White','Black','Brown','Gray'],0,'Additive color mixing'),
	qb(9,'hard','Fallacy attacking the person not the argument?',['Ad hominem','Straw man','Red herring','Slippery slope'],0,'Latin: to the person'),

	// ============================================================
	// ROUND 2 QUESTIONS — 90 additional (9 per category, total 300)
	// ============================================================

	// ---- 0: Science (additional) ----
	qb(0,'easy','What is the nearest star to Earth besides the Sun?',['Proxima Centauri','Sirius','Alpha Centauri A','Betelgeuse'],0,'About 4.24 light-years away'),
	qb(0,'easy','What gas makes up about 78% of Earth\'s atmosphere?',['Nitrogen','Oxygen','Carbon dioxide','Argon'],0,'Symbol N, atomic number 7'),
	qb(0,'medium','What planet is known as the Red Planet?',['Mars','Venus','Jupiter','Saturn'],0,'Named after Roman god of war'),
	qb(0,'medium','What type of chemical bond involves sharing electrons?',['Covalent','Ionic','Metallic','Hydrogen'],0,'Common in organic molecules'),
	qb(0,'hard','What is the most abundant protein in the human body?',['Collagen','Keratin','Hemoglobin','Myosin'],0,'Found in skin and connective tissue'),
	qb(0,'easy','What is the freezing point of water in Fahrenheit?',['32','0','100','212'],0,'Below this, ice forms'),
	qb(0,'hard','What subatomic particle carries the strong nuclear force?',['Gluon','Photon','W boson','Graviton'],0,'Holds quarks together'),
	qb(0,'medium','What organ produces insulin in the body?',['Pancreas','Liver','Kidney','Thyroid'],0,'Located behind the stomach'),
	qb(0,'hard','What is the Doppler effect?',['Change in wave frequency due to motion','Light bending around objects','Sound echoing in caves','Heat transfer through radiation'],0,'Why ambulance sirens change pitch'),

	// ---- 1: History (additional) ----
	qb(1,'easy','Which ancient city was famous for its Hanging Gardens?',['Babylon','Athens','Rome','Alexandria'],0,'One of the Seven Wonders'),
	qb(1,'easy','Who was the first person to walk on the Moon?',['Neil Armstrong','Buzz Aldrin','John Glenn','Yuri Gagarin'],0,'One small step for man'),
	qb(1,'medium','What war was fought from 1950 to 1953 in Asia?',['Korean War','Vietnam War','Sino-Japanese War','Malayan Emergency'],0,'North vs South, 38th parallel'),
	qb(1,'medium','Who was the first female Prime Minister of the UK?',['Margaret Thatcher','Theresa May','Tony Blair','Elizabeth II'],0,'The Iron Lady'),
	qb(1,'hard','Approximately what year was Gutenberg\'s printing press invented?',['1440','1500','1380','1520'],0,'Movable type in Mainz, Germany'),
	qb(1,'hard','Which empire built Machu Picchu?',['Inca','Aztec','Maya','Olmec'],0,'High in the Andes of Peru'),
	qb(1,'easy','What document declared American independence from Britain?',['Declaration of Independence','Constitution','Bill of Rights','Magna Carta'],0,'Adopted July 4, 1776'),
	qb(1,'medium','Who led India\'s nonviolent independence movement?',['Mahatma Gandhi','Jawaharlal Nehru','Subhas Chandra Bose','B.R. Ambedkar'],0,'Father of the Nation'),
	qb(1,'hard','What was the Byzantine Empire also known as?',['Eastern Roman Empire','Holy Roman Empire','Ottoman Empire','Seljuk Empire'],0,'Capital at Constantinople'),

	// ---- 2: Geography (additional) ----
	qb(2,'easy','What is the largest country in the world by area?',['Russia','Canada','China','United States'],0,'Spans two continents'),
	qb(2,'easy','On which continent is the Amazon Rainforest?',['South America','Africa','Asia','Australia'],0,'Brazil holds the majority'),
	qb(2,'medium','What is the highest mountain in Africa?',['Mount Kilimanjaro','Mount Kenya','Atlas Mountains','Drakensberg'],0,'In Tanzania, a stratovolcano'),
	qb(2,'medium','Which river flows through London?',['Thames','Seine','Danube','Rhine'],0,'About 215 miles long'),
	qb(2,'hard','Which country has the most active volcanoes?',['Indonesia','Japan','Iceland','Philippines'],0,'Part of the Ring of Fire'),
	qb(2,'easy','What is the capital of France?',['Paris','Lyon','Marseille','Nice'],0,'City of Light'),
	qb(2,'medium','What sea separates Africa from Europe?',['Mediterranean Sea','Red Sea','Black Sea','Adriatic Sea'],0,'Latin for middle of the earth'),
	qb(2,'hard','What is often considered the driest non-polar desert?',['Atacama','Sahara','Gobi','Namib'],0,'In Chile, some areas have never recorded rain'),
	qb(2,'hard','What is the world\'s largest landlocked country?',['Kazakhstan','Mongolia','Chad','Mali'],0,'In Central Asia, formerly Soviet'),

	// ---- 3: Entertainment (additional) ----
	qb(3,'easy','What animated film features sisters Elsa and Anna?',['Frozen','Tangled','Moana','Brave'],0,'Let it go'),
	qb(3,'easy','Who played Iron Man in the Marvel Cinematic Universe?',['Robert Downey Jr.','Chris Evans','Chris Hemsworth','Mark Ruffalo'],0,'Genius, billionaire, philanthropist'),
	qb(3,'medium','What streaming service originally produced Stranger Things?',['Netflix','Hulu','Amazon Prime','Disney+'],0,'Launched in 2016'),
	qb(3,'medium','Who is known as the King of Pop?',['Michael Jackson','Elvis Presley','Prince','Stevie Wonder'],0,'Thriller, Billie Jean'),
	qb(3,'hard','What was the first Pixar feature film?',['Toy Story','A Bug\'s Life','Finding Nemo','Monsters Inc.'],0,'Released 1995, Buzz and Woody'),
	qb(3,'hard','Who directed The Godfather?',['Francis Ford Coppola','Martin Scorsese','Brian De Palma','Ridley Scott'],0,'An offer you can\'t refuse'),
	qb(3,'easy','What planet does Superman come from?',['Krypton','Mars','Vulcan','Asgard'],0,'Destroyed, last son'),
	qb(3,'medium','In which city is the TV show Friends set?',['New York City','Los Angeles','Chicago','Boston'],0,'Central Perk coffee shop'),
	qb(3,'hard','Who composed the score for the original Star Wars trilogy?',['John Williams','Hans Zimmer','Howard Shore','Ennio Morricone'],0,'Also scored Jaws and Indiana Jones'),

	// ---- 4: Sports (additional) ----
	qb(4,'easy','How many players per basketball team are on the court?',['5','6','4','7'],0,'Ten total from both teams'),
	qb(4,'easy','Which country hosts the Tour de France?',['France','Italy','Spain','Belgium'],0,'Three-week cycling race'),
	qb(4,'medium','What is the national sport of Japan?',['Sumo wrestling','Judo','Karate','Baseball'],0,'Ancient tradition, yokozuna rank'),
	qb(4,'medium','How long is a marathon in miles (approximately)?',['26.2','25','30','22'],0,'Based on Greek legend'),
	qb(4,'hard','Who holds the men\'s 100m sprint world record?',['Usain Bolt','Tyson Gay','Yohan Blake','Justin Gatlin'],0,'9.58 seconds in Berlin 2009'),
	qb(4,'hard','What sport has been played on the Moon?',['Golf','Baseball','Tennis','Soccer'],0,'Alan Shepard, Apollo 14, 1971'),
	qb(4,'easy','Which sport uses a puck?',['Ice hockey','Field hockey','Lacrosse','Curling'],0,'Played on ice with sticks'),
	qb(4,'medium','How many sets must a player win in a men\'s Grand Slam match?',['3 out of 5','2 out of 3','4 out of 7','3 out of 3'],0,'Best of five'),
	qb(4,'hard','Where were the original ancient Olympic Games held?',['Olympia, Greece','Athens, Greece','Sparta, Greece','Delphi, Greece'],0,'Started around 776 BC'),

	// ---- 5: Technology (additional) ----
	qb(5,'easy','What does RAM stand for?',['Random Access Memory','Read Access Memory','Rapid Access Module','Real-time Active Memory'],0,'Volatile computer memory'),
	qb(5,'easy','Who co-founded Microsoft alongside Bill Gates?',['Paul Allen','Steve Ballmer','Steve Wozniak','Larry Page'],0,'In Albuquerque, 1975'),
	qb(5,'medium','What year was the first iPhone released?',['2007','2005','2008','2010'],0,'Steve Jobs keynote, Macworld'),
	qb(5,'medium','What programming language is most used for web frontend?',['JavaScript','Python','Java','C++'],0,'Originally called Mocha'),
	qb(5,'hard','What does HTTPS stand for?',['HyperText Transfer Protocol Secure','High Tech Transfer Protocol System','Hyper Transfer Protocol Safe','HyperText Transaction Protocol Secure'],0,'Uses SSL/TLS encryption'),
	qb(5,'hard','Who is often called the first computer programmer?',['Ada Lovelace','Alan Turing','Charles Babbage','Grace Hopper'],0,'Wrote algorithms for the Analytical Engine'),
	qb(5,'easy','What does PDF stand for?',['Portable Document Format','Print Document File','Page Display Format','Public Data File'],0,'Created by Adobe'),
	qb(5,'medium','Who created the Linux kernel?',['Linus Torvalds','Richard Stallman','Dennis Ritchie','Ken Thompson'],0,'Finnish software engineer, 1991'),
	qb(5,'hard','What was IBM\'s chess-playing computer called?',['Deep Blue','Watson','HAL 9000','ENIAC'],0,'Defeated Kasparov in 1997'),

	// ---- 6: Nature (additional) ----
	qb(6,'easy','What is the largest land animal?',['Elephant','Rhinoceros','Hippopotamus','Giraffe'],0,'African species is the largest'),
	qb(6,'easy','How many wings does a bee have?',['4','2','6','8'],0,'Two pairs, front and back'),
	qb(6,'medium','What is the fastest bird in the world?',['Peregrine falcon','Bald eagle','Swift','Albatross'],0,'Dives at over 200 mph'),
	qb(6,'medium','What is the largest reef system on Earth?',['Great Barrier Reef','Belize Barrier Reef','Red Sea Coral Reef','New Caledonia Reef'],0,'Off Australia\'s coast, 2,300 km'),
	qb(6,'hard','Which continent has no native reptile species?',['Antarctica','Europe','Australia','North America'],0,'Too cold for cold-blooded animals'),
	qb(6,'easy','What is a group of fish called?',['School','Pack','Flock','Herd'],0,'Also called a shoal'),
	qb(6,'medium','Which animal has the largest brain by weight?',['Sperm whale','Elephant','Dolphin','Human'],0,'About 17 pounds'),
	qb(6,'hard','Which tree species is known for living the longest?',['Bristlecone pine','Giant sequoia','Olive tree','Yew'],0,'Over 5,000 years in California'),
	qb(6,'hard','What is the deepest-diving marine mammal?',['Cuvier\'s beaked whale','Sperm whale','Elephant seal','Blue whale'],0,'Recorded at nearly 3,000 meters'),

	// ---- 7: Food & Drink (additional) ----
	qb(7,'easy','What Italian dish is a flatbread with toppings?',['Pizza','Calzone','Focaccia','Bruschetta'],0,'Originated in Naples'),
	qb(7,'easy','What fruit is traditionally used to make wine?',['Grape','Apple','Pear','Plum'],0,'Vineyards grow them'),
	qb(7,'medium','Which nut is a key ingredient in classic pesto?',['Pine nut','Walnut','Cashew','Hazelnut'],0,'Also called pignoli'),
	qb(7,'medium','Kimchi is a traditional dish from which country?',['South Korea','Japan','China','Thailand'],0,'Fermented vegetables, often cabbage'),
	qb(7,'hard','At approximately what temperature Celsius does sugar caramelize?',['170','100','250','130'],0,'Golden brown transformation'),
	qb(7,'easy','Which vegetable is known for making people cry when cut?',['Onion','Garlic','Pepper','Radish'],0,'Releases syn-propanethial-S-oxide'),
	qb(7,'medium','What grain is the primary ingredient in beer?',['Barley','Wheat','Rice','Corn'],0,'Malted before brewing'),
	qb(7,'hard','Which ancient civilization first consumed chocolate as a drink?',['Aztecs/Maya','Romans','Chinese','Egyptians'],0,'Central America, called xocolatl'),
	qb(7,'hard','What Japanese cooking method uses deep-frying in light batter?',['Tempura','Teriyaki','Tonkatsu','Yakitori'],0,'Portuguese influence, 16th century'),

	// ---- 8: Arts & Culture (additional) ----
	qb(8,'easy','What is the art of beautiful handwriting called?',['Calligraphy','Typography','Stenography','Lithography'],0,'From Greek kallos and graphein'),
	qb(8,'easy','Who wrote A Christmas Carol?',['Charles Dickens','Mark Twain','Jane Austen','Oscar Wilde'],0,'Scrooge and three ghosts'),
	qb(8,'medium','What art movement did Andy Warhol lead?',['Pop Art','Surrealism','Abstract Expressionism','Minimalism'],0,'Campbell\'s Soup Cans, Marilyn'),
	qb(8,'medium','In musical terminology, what does "forte" mean?',['Loud','Soft','Fast','Slow'],0,'Abbreviated as f'),
	qb(8,'hard','Which Greek column order features scrolled capitals?',['Ionic','Doric','Corinthian','Tuscan'],0,'Between simple and ornate'),
	qb(8,'hard','Who wrote Don Quixote?',['Miguel de Cervantes','Gabriel Garcia Marquez','Jorge Luis Borges','Federico Garcia Lorca'],0,'Published 1605, tilting at windmills'),
	qb(8,'easy','How many strings does a standard violin have?',['4','5','6','3'],0,'G, D, A, E tuning'),
	qb(8,'medium','What dance style originated in southern Spain?',['Flamenco','Tango','Samba','Salsa'],0,'Rhythmic stomping and guitar'),
	qb(8,'hard','What painting technique uses small distinct dots of color?',['Pointillism','Impasto','Chiaroscuro','Sfumato'],0,'Georges Seurat pioneered it'),

	// ---- 9: General Knowledge (additional) ----
	qb(9,'easy','How many colors are in a rainbow?',['7','6','5','8'],0,'ROY G BIV'),
	qb(9,'easy','What is the largest planet in our solar system?',['Jupiter','Saturn','Neptune','Uranus'],0,'A gas giant, the Great Red Spot'),
	qb(9,'medium','What is the study of earthquakes called?',['Seismology','Geology','Volcanology','Tectonics'],0,'Greek seismos means shaking'),
	qb(9,'medium','How many teeth does an adult human normally have?',['32','28','30','36'],0,'Including wisdom teeth'),
	qb(9,'hard','Which country has the most UNESCO World Heritage Sites?',['Italy','China','Spain','France'],0,'Over 55 sites'),
	qb(9,'easy','What is the Roman numeral for 50?',['L','C','D','V'],0,'Between X and C'),
	qb(9,'medium','What element does the chemical symbol Fe represent?',['Iron','Lead','Fluorine','Francium'],0,'Latin: ferrum'),
	qb(9,'hard','What is the SI unit of electric current?',['Ampere','Volt','Watt','Ohm'],0,'Named after Andre-Marie Ampere'),
	qb(9,'hard','What logical fallacy assumes a chain of events from one action?',['Slippery slope','Ad hominem','Straw man','False dilemma'],0,'If A then B then C then catastrophe'),
];


// ============================================================
// ACHIEVEMENTS (40)
// ============================================================

const ACHIEVEMENT_DEFS: AchDef[] = [
	{ name: 'First Steps', desc: 'Complete your first game', check: s => s.gamesPlayed >= 1 },
	{ name: 'Rookie', desc: 'Play 5 games', check: s => s.gamesPlayed >= 5 },
	{ name: 'Regular', desc: 'Play 25 games', check: s => s.gamesPlayed >= 25 },
	{ name: 'Veteran', desc: 'Play 100 games', check: s => s.gamesPlayed >= 100 },
	{ name: 'Century', desc: 'Score 100+ in a single game', check: (s, g) => g.score >= 100 },
	{ name: 'High Roller', desc: 'Score 1,000+ in a single game', check: (s, g) => g.score >= 1000 },
	{ name: 'Grand Master', desc: 'Score 5,000+ in a single game', check: (s, g) => g.score >= 5000 },
	{ name: 'Legend', desc: 'Score 10,000+ in a single game', check: (s, g) => g.score >= 10000 },
	{ name: 'Perfect Ten', desc: 'Answer 10 in a row correctly', check: s => s.bestStreak >= 10 },
	{ name: 'On Fire', desc: 'Answer 20 in a row correctly', check: s => s.bestStreak >= 20 },
	{ name: 'Unstoppable', desc: 'Answer 50 in a row correctly', check: s => s.bestStreak >= 50 },
	{ name: 'Combo King', desc: 'Reach a x5 combo', check: (s, g) => g.bestCombo >= 5 },
	{ name: 'Combo Master', desc: 'Reach a x10 combo', check: (s, g) => g.bestCombo >= 10 },
	{ name: 'Sharpshooter', desc: '90%+ accuracy over 50+ answers', check: s => s.totalAnswers >= 50 && (s.correctAnswers / s.totalAnswers) >= 0.9 },
	{ name: 'Know It All', desc: '100% accuracy in a 20-question game', check: (s, g) => g.correctCount >= 20 && g.totalAnswered >= 20 && g.correctCount === g.totalAnswered },
	{ name: 'Speed Demon', desc: 'Answer 15+ in Speed mode', check: (s, g) => g.mode === 'speed' && g.correctCount >= 15 },
	{ name: 'Blitz Master', desc: 'Answer 20+ in Blitz mode', check: (s, g) => g.mode === 'blitz' && g.correctCount >= 20 },
	{ name: 'Endurance', desc: 'Complete a Marathon game', check: (s, g) => g.mode === 'marathon' && g.totalAnswered >= 50 },
	{ name: 'Daily Player', desc: 'Complete a Daily Challenge', check: (s, g) => g.mode === 'daily' },
	{ name: 'Daily Streak 3', desc: '3-day daily streak', check: s => s.dailyStreak >= 3 },
	{ name: 'Daily Streak 7', desc: '7-day daily streak', check: s => s.dailyStreak >= 7 },
	{ name: 'Daily Streak 30', desc: '30-day daily streak', check: s => s.dailyStreak >= 30 },
	{ name: 'Science Buff', desc: 'Play 5 Science category games', check: s => (s.categoryGames[0] || 0) >= 5 },
	{ name: 'History Buff', desc: 'Play 5 History category games', check: s => (s.categoryGames[1] || 0) >= 5 },
	{ name: 'Globe Trotter', desc: 'Play 5 Geography category games', check: s => (s.categoryGames[2] || 0) >= 5 },
	{ name: 'Pop Culture', desc: 'Play 5 Entertainment category games', check: s => (s.categoryGames[3] || 0) >= 5 },
	{ name: 'Sports Fan', desc: 'Play 5 Sports category games', check: s => (s.categoryGames[4] || 0) >= 5 },
	{ name: 'Techie', desc: 'Play 5 Technology category games', check: s => (s.categoryGames[5] || 0) >= 5 },
	{ name: 'Naturalist', desc: 'Play 5 Nature category games', check: s => (s.categoryGames[6] || 0) >= 5 },
	{ name: 'Foodie', desc: 'Play 5 Food & Drink category games', check: s => (s.categoryGames[7] || 0) >= 5 },
	{ name: 'Cultured', desc: 'Play 5 Arts & Culture category games', check: s => (s.categoryGames[8] || 0) >= 5 },
	{ name: 'Polymath', desc: 'Play in all 10 categories', check: s => s.categoryGames.every(n => n > 0) },
	{ name: 'No Lifelines', desc: 'Win without using any lifelines', check: (s, g) => g.correctCount >= 15 && g.lifelines.fifty && g.lifelines.skip && g.lifelines.hint },
	{ name: 'Lifeline Lover', desc: 'Use all 3 lifelines in one game', check: (s, g) => !g.lifelines.fifty && !g.lifelines.skip && !g.lifelines.hint },
	{ name: 'Half and Half', desc: 'Use 50:50 lifeline 10 times total', check: s => s.lifelinesUsed >= 10 },
	{ name: 'Level 5', desc: 'Reach level 5', check: s => s.level >= 5 },
	{ name: 'Level 10', desc: 'Reach level 10', check: s => s.level >= 10 },
	{ name: 'Level 25', desc: 'Reach level 25', check: s => s.level >= 25 },
	{ name: 'Score Chaser', desc: 'Accumulate 50,000 total score', check: s => s.totalScore >= 50000 },
	{ name: 'Streak Survivor', desc: 'Survive 30+ in Streak mode', check: (s, g) => g.mode === 'streak' && g.correctCount >= 30 },
];

// ============================================================
// MODULE STATE
// ============================================================

let worldRef: World = null!;
let currentScreen: Screen = 'title';

const defaultGameState = (): GameState => ({
	mode: 'classic', difficulty: 'medium', category: -1,
	questions: [], currentIndex: 0, score: 0, correctCount: 0, totalAnswered: 0,
	combo: 0, bestCombo: 0, streak: 0, bestStreak: 0,
	lifelines: { fifty: true, skip: true, hint: true },
	timer: 30, maxTimer: 30, eliminated: [],
	doublePoints: 0, timeFrozen: false, hasDouble: true, hasFreeze: true,
	results: [],
	gameStartTime: 0, elapsedTime: 0, xpGained: 0,
});

let gs: GameState = defaultGameState();

const defaultStats = (): GameStats => ({
	gamesPlayed: 0, totalScore: 0, bestScore: 0, correctAnswers: 0, totalAnswers: 0,
	bestStreak: 0, lifelinesUsed: 0, dailyStreak: 0, lastDailyDate: '',
	level: 1, xp: 0, categoryGames: new Array(10).fill(0),
	categoryCorrect: new Array(10).fill(0), categoryTotal: new Array(10).fill(0),
});

let stats: GameStats = defaultStats();
let leaderboard: LeaderboardEntry[] = [];
let unlockedAchievements: boolean[] = new Array(40).fill(false);
let settingsState = { masterVol: 100, sfxVol: 100, musicVol: 100, themeIdx: 0 };
let achvPage = 0;

// UI doc references
const docs: Record<string, UIKitDocument | null> = {};
// Panel follower offsets (for show/hide)
const offsets: Record<string, Float32Array> = {};

// Timers
let feedbackTimer = 0;
let feedbackShowing = false;
let countdownTimer = 0;
let countdownActive = false;
let toastTimer = 0;
let speedModeTimer = 60;
let gameRunning = false;
let gamePaused = false;
let gameElapsed = 0;
let hudBounceTimer = 0;
let wrongFlashTimer = 0;

// Review state
let reviewPage = 0;

// Streak effects
let streakLevel = 0;
let defaultParticleColor = 0x00ffff;

// Game history
interface GameHistoryEntry {
	mode: string;
	score: number;
	correct: number;
	total: number;
	date: string;
}
let gameHistory: GameHistoryEntry[] = [];

// Scene references
let particleSpeeds: number[] = [];
let particleGeo: BufferGeometry | null = null;
let particleMat: PointsMaterial | null = null;
let wireframeGroups: Group[] = [];
let wireMats: LineBasicMaterial[] = [];
let sceneLights: PointLight[] = [];
let floorGrid: GridHelper | null = null;
let ceilGrid: GridHelper | null = null;
let sceneRing: Group | null = null;
let orbitingLights: PointLight[] = [];

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function mulberry32(seed: number): () => number {
	let s = seed | 0;
	return () => {
		s = s + 0x6D2B79F5 | 0;
		let t = Math.imul(s ^ s >>> 15, 1 | s);
		t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
		return ((t ^ t >>> 14) >>> 0) / 4294967296;
	};
}

function getDailySeed(): number {
	const d = new Date();
	return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

function shuffle<T>(arr: T[], rng: () => number = Math.random): T[] {
	const a = [...arr];
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}

function loadStats(): void {
	try {
		const raw = localStorage.getItem('neon-trivia-stats');
		if (raw) {
			const parsed = JSON.parse(raw);
			stats = { ...defaultStats(), ...parsed };
			if (!Array.isArray(stats.categoryGames) || stats.categoryGames.length !== 10) {
				stats.categoryGames = new Array(10).fill(0);
			}
		}
	} catch { /* use defaults */ }
}

function saveStats(): void {
	try { localStorage.setItem('neon-trivia-stats', JSON.stringify(stats)); } catch { /* noop */ }
}

function loadLeaderboard(): void {
	try {
		const raw = localStorage.getItem('neon-trivia-lb');
		if (raw) leaderboard = JSON.parse(raw);
	} catch { /* use defaults */ }
}

function saveLeaderboard(): void {
	try { localStorage.setItem('neon-trivia-lb', JSON.stringify(leaderboard.slice(0, 20))); } catch { /* noop */ }
}

function loadAchievements(): void {
	try {
		const raw = localStorage.getItem('neon-trivia-ach');
		if (raw) {
			const parsed = JSON.parse(raw);
			if (Array.isArray(parsed) && parsed.length === 40) unlockedAchievements = parsed;
		}
	} catch { /* use defaults */ }
}

function saveAchievements(): void {
	try { localStorage.setItem('neon-trivia-ach', JSON.stringify(unlockedAchievements)); } catch { /* noop */ }
}

function loadSettings(): void {
	try {
		const raw = localStorage.getItem('neon-trivia-settings');
		if (raw) settingsState = { ...settingsState, ...JSON.parse(raw) };
	} catch { /* use defaults */ }
}

function saveSettings(): void {
	try { localStorage.setItem('neon-trivia-settings', JSON.stringify(settingsState)); } catch { /* noop */ }
}

function loadGameHistory(): void {
	try {
		const raw = localStorage.getItem('neon-trivia-history');
		if (raw) gameHistory = JSON.parse(raw);
	} catch { /* use defaults */ }
}

function saveGameHistory(): void {
	try { localStorage.setItem('neon-trivia-history', JSON.stringify(gameHistory.slice(0, 20))); } catch { /* noop */ }
}

function xpForLevel(level: number): number { return level * 500; }

function calculateScore(diff: Difficulty, timeLeft: number, combo: number): number {
	const base = 100;
	const diffMult = diff === 'easy' ? 1 : diff === 'medium' ? 2 : 3;
	const speedBonus = Math.max(0, Math.floor(timeLeft * 5));
	const comboMult = Math.min(combo, 10);
	let result = (base * diffMult + speedBonus) * Math.max(1, comboMult);
	if (gs.doublePoints > 0) {
		result *= 2;
		gs.doublePoints--;
	}
	return result;
}

function todayStr(): string {
	const d = new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ============================================================
// PANEL SHOW / HIDE
// ============================================================

function showPanel(name: string): void {
	const pc = PANEL_CONFIGS[name];
	const ov = offsets[name];
	if (pc && ov) {
		ov[0] = 0;
		ov[1] = pc.y;
		ov[2] = pc.z;
	}
}

function hidePanel(name: string): void {
	const ov = offsets[name];
	if (ov) {
		ov[1] = -100;
	}
}

function hideAllPanels(): void {
	for (const name of Object.keys(PANEL_CONFIGS)) {
		hidePanel(name);
	}
}

function showToastMsg(msg: string, duration = 2): void {
	const d = docs['toast'];
	if (d) {
		const lbl = d.getElementById('lbl-toast') as UIKit.Text;
		lbl?.setProperties({ text: msg });
	}
	showPanel('toast');
	toastTimer = duration;
}

// ============================================================
// SCREEN MANAGEMENT
// ============================================================

function showScreen(screen: Screen): void {
	hideAllPanels();
	currentScreen = screen;

	switch (screen) {
		case 'title':
			showPanel('title');
			updateTitleLabels();
			break;
		case 'modeselect':
			showPanel('modeselect');
			break;
		case 'catpick':
			showPanel('catpick');
			break;
		case 'difficulty':
			showPanel('difficulty');
			break;
		case 'countdown':
			showPanel('countdown');
			break;
		case 'playing':
			showPanel('question');
			showPanel('answers');
			showPanel('hud');
			break;
		case 'pause':
			showPanel('question');
			showPanel('answers');
			showPanel('hud');
			showPanel('pause');
			break;
		case 'gameover':
			showPanel('gameover');
			updateGameOverUI();
			break;
		case 'achvlist':
			showPanel('achvlist');
			updateAchievementsUI();
			break;
		case 'stats':
			showPanel('stats');
			updateStatsUI();
			break;
		case 'settings':
			showPanel('settings');
			updateSettingsUI();
			break;
		case 'leaderboard':
			showPanel('leaderboard');
			updateLeaderboardUI();
			break;
		case 'help':
			showPanel('help');
			break;
		case 'review':
			showPanel('review');
			updateReviewUI();
			break;
	}
}

// ============================================================
// GAME LOGIC
// ============================================================

function getQuestionsForGame(mode: GameMode, category: number, difficulty: Difficulty): TriviaQuestion[] {
	let pool = [...QUESTIONS];

	if (mode === 'category' && category >= 0 && category < 10) {
		pool = pool.filter(q => q.category === category);
	}

	if (mode === 'daily') {
		const rng = mulberry32(getDailySeed());
		pool = shuffle(pool, rng);
	} else {
		// Difficulty-based prioritization: matching difficulty first, then others as filler
		const matching = shuffle(pool.filter(q => q.difficulty === difficulty));
		const others = shuffle(pool.filter(q => q.difficulty !== difficulty));
		pool = [...matching, ...others];
	}

	const count = MODE_QUESTION_COUNT[mode];
	return pool.slice(0, Math.min(count, pool.length));
}

function startGame(mode: GameMode, difficulty: Difficulty, category: number): void {
	gs = defaultGameState();
	gs.mode = mode;
	gs.difficulty = difficulty;
	gs.category = category;
	gs.questions = getQuestionsForGame(mode, category, difficulty);
	gs.gameStartTime = Date.now();

	// Set timer
	if (mode === 'practice' || mode === 'streak') {
		gs.maxTimer = 9999;
		gs.timer = 9999;
	} else if (mode === 'speed') {
		speedModeTimer = 60;
		gs.maxTimer = DIFF_TIMERS[difficulty];
		gs.timer = DIFF_TIMERS[difficulty];
	} else if (mode === 'blitz') {
		gs.maxTimer = 10;
		gs.timer = 10;
	} else {
		gs.maxTimer = DIFF_TIMERS[difficulty];
		gs.timer = DIFF_TIMERS[difficulty];
	}

	gameRunning = false;
	gamePaused = false;
	gameElapsed = 0;
	feedbackShowing = false;
	feedbackTimer = 0;

	// Start countdown
	countdownTimer = 3;
	countdownActive = true;
	showScreen('countdown');
}

function beginPlay(): void {
	gameRunning = true;
	showScreen('playing');
	showQuestion();
}

function showQuestion(): void {
	if (gs.currentIndex >= gs.questions.length) {
		endGame();
		return;
	}

	const question = gs.questions[gs.currentIndex];
	gs.eliminated = [];

	const dq = docs['question'];
	if (dq) {
		const catLbl = dq.getElementById('lbl-category') as UIKit.Text;
		catLbl?.setProperties({ text: CATEGORIES[question.category] || 'TRIVIA' });
		const qLbl = dq.getElementById('lbl-question') as UIKit.Text;
		qLbl?.setProperties({ text: question.question });
	}

	const da = docs['answers'];
	if (da) {
		const labels = ['A', 'B', 'C', 'D'];
		const btns = ['btn-a', 'btn-b', 'btn-c', 'btn-d'];
		for (let i = 0; i < 4; i++) {
			const btn = da.getElementById(btns[i]) as UIKit.Text;
			btn?.setProperties({ text: `${labels[i]}) ${question.answers[i]}` });
		}
		// Reset lifeline buttons
		const fifty = da.getElementById('btn-fifty') as UIKit.Text;
		fifty?.setProperties({ text: gs.lifelines.fifty ? '50:50' : '---' });
		const skip = da.getElementById('btn-skip') as UIKit.Text;
		skip?.setProperties({ text: gs.lifelines.skip ? 'SKIP' : '---' });
		const hint = da.getElementById('btn-hint') as UIKit.Text;
		hint?.setProperties({ text: gs.lifelines.hint ? 'HINT' : '---' });
	}

	// Clear time freeze for new question
	gs.timeFrozen = false;

	// Reset timer for this question
	if (gs.mode !== 'speed') {
		gs.timer = gs.maxTimer;
	}

	// Power-up button state
	if (da) {
		const dbl = da.getElementById('btn-double') as UIKit.Text;
		dbl?.setProperties({ text: gs.hasDouble ? '2X PTS' : '---' });
		const frz = da.getElementById('btn-freeze') as UIKit.Text;
		frz?.setProperties({ text: gs.hasFreeze ? 'FREEZE' : '---' });
	}

	updateHUD();
}

function selectAnswer(idx: number): void {
	if (!gameRunning || feedbackShowing || gamePaused) return;
	if (gs.eliminated.includes(idx)) return;

	const question = gs.questions[gs.currentIndex];
	const isCorrect = idx === question.correct;

	gs.totalAnswered++;
	gs.results[gs.currentIndex] = isCorrect;

	// Visual answer feedback — mark correct/wrong on buttons
	const da = docs['answers'];
	if (da) {
		const btns = ['btn-a', 'btn-b', 'btn-c', 'btn-d'];
		const labels = ['A', 'B', 'C', 'D'];
		for (let i = 0; i < 4; i++) {
			if (gs.eliminated.includes(i)) continue;
			const btn = da.getElementById(btns[i]) as UIKit.Text;
			if (i === question.correct) {
				btn?.setProperties({ text: `[OK] ${labels[i]}) ${question.answers[i]}` });
			} else if (i === idx && !isCorrect) {
				btn?.setProperties({ text: `[X] ${labels[i]}) ${question.answers[i]}` });
			}
		}
	}

	if (isCorrect) {
		gs.correctCount++;
		gs.combo++;
		gs.streak++;
		if (gs.combo > gs.bestCombo) gs.bestCombo = gs.combo;
		if (gs.streak > gs.bestStreak) gs.bestStreak = gs.streak;
		const pts = calculateScore(question.difficulty, gs.timer, gs.combo);
		gs.score += pts;
		showToastMsg(`+${pts} pts! Combo x${Math.min(gs.combo, 10)}`, 1.2);

		// Visual feedback: HUD bounce
		hudBounceTimer = 0.3;
		const hudOv = offsets['hud'];
		if (hudOv) {
			hudOv[1] = PANEL_CONFIGS['hud'].y + 0.05;
		}
	} else {
		gs.combo = 0;
		gs.streak = 0;
		showToastMsg(`Wrong! Answer: ${question.answers[question.correct]}`, 1.8);

		// Visual feedback: red flash on scene lights
		wrongFlashTimer = 0.4;
		for (const l of sceneLights) {
			l.color.setHex(0xff0000);
			l.intensity = 1.5;
		}

		// Streak mode: game over on wrong answer
		if (gs.mode === 'streak') {
			feedbackShowing = true;
			feedbackTimer = 1.8;
			updateHUD();
			return;
		}
	}

	updateHUD();

	// Show feedback briefly
	feedbackShowing = true;
	feedbackTimer = 1.2;
}

function nextQuestion(): void {
	gs.currentIndex++;

	// Check end conditions
	const maxQ = MODE_QUESTION_COUNT[gs.mode];
	if (gs.currentIndex >= gs.questions.length || gs.currentIndex >= maxQ) {
		endGame();
		return;
	}

	// Speed mode: check total timer
	if (gs.mode === 'speed' && speedModeTimer <= 0) {
		endGame();
		return;
	}

	showQuestion();
}

function endGame(): void {
	gameRunning = false;
	gs.elapsedTime = (Date.now() - gs.gameStartTime) / 1000;

	// Calculate XP
	gs.xpGained = Math.floor(gs.score / 10) + gs.correctCount * 5;

	// Update stats
	stats.gamesPlayed++;
	stats.totalScore += gs.score;
	if (gs.score > stats.bestScore) stats.bestScore = gs.score;
	stats.correctAnswers += gs.correctCount;
	stats.totalAnswers += gs.totalAnswered;
	if (gs.bestStreak > stats.bestStreak) stats.bestStreak = gs.bestStreak;
	stats.xp += gs.xpGained;
	while (stats.xp >= xpForLevel(stats.level)) {
		stats.xp -= xpForLevel(stats.level);
		stats.level++;
	}

	// Category tracking
	if (gs.mode === 'category' && gs.category >= 0) {
		stats.categoryGames[gs.category] = (stats.categoryGames[gs.category] || 0) + 1;
	} else {
		// Count categories encountered
		const catsUsed = new Set(gs.questions.slice(0, gs.totalAnswered).map(q => q.category));
		for (const c of catsUsed) {
			stats.categoryGames[c] = (stats.categoryGames[c] || 0) + 1;
		}
	}

	// Daily streak
	if (gs.mode === 'daily') {
		const today = todayStr();
		if (stats.lastDailyDate !== today) {
			const yesterday = new Date();
			yesterday.setDate(yesterday.getDate() - 1);
			const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
			stats.dailyStreak = stats.lastDailyDate === yStr ? stats.dailyStreak + 1 : 1;
			stats.lastDailyDate = today;
		}
	}

	saveStats();

	// Check achievements
	let newAchievements = 0;
	for (let i = 0; i < ACHIEVEMENT_DEFS.length; i++) {
		if (!unlockedAchievements[i] && ACHIEVEMENT_DEFS[i].check(stats, gs)) {
			unlockedAchievements[i] = true;
			newAchievements++;
		}
	}
	saveAchievements();
	if (newAchievements > 0) {
		showToastMsg(`${newAchievements} new achievement${newAchievements > 1 ? 's' : ''} unlocked!`, 3);
	}

	// Update leaderboard
	leaderboard.push({
		name: `Player L${stats.level}`,
		score: gs.score,
		mode: gs.mode.toUpperCase(),
		date: todayStr(),
	});
	leaderboard.sort((a, b) => b.score - a.score);
	leaderboard = leaderboard.slice(0, 20);
	saveLeaderboard();

	showScreen('gameover');
}

function useFiftyFifty(): void {
	if (!gameRunning || feedbackShowing || !gs.lifelines.fifty) return;
	gs.lifelines.fifty = false;
	stats.lifelinesUsed++;

	const question = gs.questions[gs.currentIndex];
	const wrongIndices = [0, 1, 2, 3].filter(i => i !== question.correct && !gs.eliminated.includes(i));
	const toRemove = shuffle(wrongIndices).slice(0, 2);
	gs.eliminated.push(...toRemove);

	const da = docs['answers'];
	if (da) {
		const btns = ['btn-a', 'btn-b', 'btn-c', 'btn-d'];
		for (const idx of toRemove) {
			const btn = da.getElementById(btns[idx]) as UIKit.Text;
			btn?.setProperties({ text: '---' });
		}
		const fifty = da.getElementById('btn-fifty') as UIKit.Text;
		fifty?.setProperties({ text: '---' });
	}
	showToastMsg('50:50 — Two wrong answers removed!', 1.5);
}

function useSkip(): void {
	if (!gameRunning || feedbackShowing || !gs.lifelines.skip) return;
	gs.lifelines.skip = false;
	stats.lifelinesUsed++;

	const da = docs['answers'];
	if (da) {
		const skip = da.getElementById('btn-skip') as UIKit.Text;
		skip?.setProperties({ text: '---' });
	}

	showToastMsg('Question skipped!', 1);
	gs.currentIndex++;
	if (gs.currentIndex >= gs.questions.length) {
		endGame();
	} else {
		showQuestion();
	}
}

function useHint(): void {
	if (!gameRunning || feedbackShowing || !gs.lifelines.hint) return;
	gs.lifelines.hint = false;
	stats.lifelinesUsed++;

	const question = gs.questions[gs.currentIndex];
	showToastMsg(`Hint: ${question.hint}`, 3);

	const da = docs['answers'];
	if (da) {
		const hint = da.getElementById('btn-hint') as UIKit.Text;
		hint?.setProperties({ text: '---' });
	}
}

function useDoublePoints(): void {
	if (!gameRunning || feedbackShowing || !gs.hasDouble) return;
	gs.hasDouble = false;
	gs.doublePoints = 3;
	showToastMsg('DOUBLE POINTS — Next 3 correct = 2x!', 2);
	const da = docs['answers'];
	if (da) {
		const btn = da.getElementById('btn-double') as UIKit.Text;
		btn?.setProperties({ text: '---' });
	}
}

function useTimeFreeze(): void {
	if (!gameRunning || feedbackShowing || !gs.hasFreeze) return;
	gs.hasFreeze = false;
	gs.timeFrozen = true;
	showToastMsg('TIME FROZEN — Clock paused this question!', 2);
	const da = docs['answers'];
	if (da) {
		const btn = da.getElementById('btn-freeze') as UIKit.Text;
		btn?.setProperties({ text: '---' });
	}
}

function togglePause(): void {
	if (!gameRunning || feedbackShowing) return;
	if (currentScreen === 'playing') {
		gamePaused = true;
		showScreen('pause');
	} else if (currentScreen === 'pause') {
		gamePaused = false;
		showScreen('playing');
	}
}

// ============================================================
// UI UPDATE FUNCTIONS
// ============================================================

function updateTitleLabels(): void {
	const d = docs['title'];
	if (!d) return;
	const lvl = d.getElementById('lbl-level') as UIKit.Text;
	lvl?.setProperties({ text: `LEVEL ${stats.level} -- ${stats.xp} XP` });
}

function updateHUD(): void {
	const d = docs['hud'];
	if (!d) return;
	const question = gs.questions[gs.currentIndex];
	const maxQ = Math.min(MODE_QUESTION_COUNT[gs.mode], gs.questions.length);

	const sc = d.getElementById('lbl-score') as UIKit.Text;
	sc?.setProperties({ text: `SCORE: ${gs.score}` });

	const qn = d.getElementById('lbl-question') as UIKit.Text;
	qn?.setProperties({ text: `Q: ${gs.currentIndex + 1}/${maxQ === 999 ? '?' : maxQ}` });

	const cb = d.getElementById('lbl-combo') as UIKit.Text;
	cb?.setProperties({ text: `x${Math.min(gs.combo + 1, 10)}` });

	const tm = d.getElementById('lbl-timer') as UIKit.Text;
	if (gs.mode === 'speed') {
		tm?.setProperties({ text: `${Math.ceil(speedModeTimer)}s` });
	} else if (gs.mode === 'practice' || gs.mode === 'streak') {
		tm?.setProperties({ text: '--' });
	} else {
		tm?.setProperties({ text: `${Math.ceil(gs.timer)}s` });
	}

	const md = d.getElementById('lbl-mode') as UIKit.Text;
	// Show difficulty and category info alongside mode
	let modeText = gs.mode.toUpperCase();
	const diffLabel = gs.difficulty === 'easy' ? 'EASY' : gs.difficulty === 'medium' ? 'MED' : 'HARD';
	modeText += ` [${diffLabel}]`;
	if (gs.mode === 'category' && gs.category >= 0) {
		modeText += ` ${CATEGORIES[gs.category]}`;
	}
	md?.setProperties({ text: modeText });

	const st = d.getElementById('lbl-streak') as UIKit.Text;
	st?.setProperties({ text: `Streak: ${gs.streak}` });

	const l1 = d.getElementById('lbl-lifeline1') as UIKit.Text;
	l1?.setProperties({ text: gs.lifelines.fifty ? '50:50' : '---' });
	const l2 = d.getElementById('lbl-lifeline2') as UIKit.Text;
	l2?.setProperties({ text: gs.lifelines.skip ? 'SKIP' : '---' });
	const l3 = d.getElementById('lbl-lifeline3') as UIKit.Text;
	l3?.setProperties({ text: gs.lifelines.hint ? 'HINT' : '---' });
}

function updateGameOverUI(): void {
	const d = docs['gameover'];
	if (!d) return;
	const accuracy = gs.totalAnswered > 0 ? Math.round((gs.correctCount / gs.totalAnswered) * 100) : 0;

	(d.getElementById('lbl-result') as UIKit.Text)?.setProperties({
		text: gs.correctCount > gs.totalAnswered * 0.7 ? 'GREAT JOB!' : 'GAME OVER',
	});
	(d.getElementById('lbl-mode') as UIKit.Text)?.setProperties({ text: gs.mode.toUpperCase() });
	(d.getElementById('lbl-score') as UIKit.Text)?.setProperties({ text: `Score: ${gs.score}` });
	(d.getElementById('lbl-correct') as UIKit.Text)?.setProperties({ text: `Correct: ${gs.correctCount}/${gs.totalAnswered}` });
	(d.getElementById('lbl-accuracy') as UIKit.Text)?.setProperties({ text: `Accuracy: ${accuracy}%` });
	(d.getElementById('lbl-streak') as UIKit.Text)?.setProperties({ text: `Best Streak: ${gs.bestStreak}` });
	(d.getElementById('lbl-combo') as UIKit.Text)?.setProperties({ text: `Best Combo: x${gs.bestCombo}` });
	(d.getElementById('lbl-time') as UIKit.Text)?.setProperties({ text: `Time: ${Math.floor(gs.elapsedTime)}s` });
	(d.getElementById('lbl-xp') as UIKit.Text)?.setProperties({ text: `+${gs.xpGained} XP` });
}

function updateAchievementsUI(): void {
	const d = docs['achvlist'];
	if (!d) return;
	const unlocked = unlockedAchievements.filter(Boolean).length;
	(d.getElementById('lbl-count') as UIKit.Text)?.setProperties({ text: `${unlocked}/40 unlocked` });

	const pageSize = 15;
	const startIdx = achvPage * pageSize;
	const totalPages = Math.ceil(ACHIEVEMENT_DEFS.length / pageSize);

	for (let i = 0; i < pageSize; i++) {
		const achIdx = startIdx + i;
		const el = d.getElementById(`ach${i}`) as UIKit.Text;
		if (!el) continue;
		if (achIdx < ACHIEVEMENT_DEFS.length) {
			const ach = ACHIEVEMENT_DEFS[achIdx];
			const icon = unlockedAchievements[achIdx] ? '[*]' : '[ ]';
			el.setProperties({ text: `${icon} ${ach.name} - ${ach.desc}` });
		} else {
			el.setProperties({ text: '' });
		}
	}

	(d.getElementById('lbl-page') as UIKit.Text)?.setProperties({ text: `${achvPage + 1}/${totalPages}` });
}

function updateStatsUI(): void {
	const d = docs['stats'];
	if (!d) return;
	const accuracy = stats.totalAnswers > 0 ? Math.round((stats.correctAnswers / stats.totalAnswers) * 100) : 0;

	const lines: string[] = [
		`Games Played: ${stats.gamesPlayed}`,
		`Total Score: ${stats.totalScore}`,
		`Best Score: ${stats.bestScore}`,
		`Correct Answers: ${stats.correctAnswers}`,
		`Total Answers: ${stats.totalAnswers}`,
		`Accuracy: ${accuracy}%`,
		`Best Streak: ${stats.bestStreak}`,
		`Lifelines Used: ${stats.lifelinesUsed}`,
		`Daily Streak: ${stats.dailyStreak}`,
		`Level: ${stats.level} (${stats.xp}/${xpForLevel(stats.level)} XP)`,
	];
	// Per-category stats
	for (let c = 0; c < 10; c++) {
		const total = stats.categoryTotal[c] || 0;
		const correct = stats.categoryCorrect[c] || 0;
		const catAcc = total > 0 ? Math.round((correct / total) * 100) : 0;
		lines.push(`${CATEGORIES[c]}: ${stats.categoryGames[c]} games, ${catAcc}% acc`);
	}
	for (let i = 0; i < 20; i++) {
		const el = d.getElementById(`stat${i}`) as UIKit.Text;
		el?.setProperties({ text: lines[i] || '' });
	}
}

function updateSettingsUI(): void {
	const d = docs['settings'];
	if (!d) return;
	(d.getElementById('lbl-master') as UIKit.Text)?.setProperties({ text: String(settingsState.masterVol) });
	(d.getElementById('lbl-sfx') as UIKit.Text)?.setProperties({ text: String(settingsState.sfxVol) });
	(d.getElementById('lbl-music') as UIKit.Text)?.setProperties({ text: String(settingsState.musicVol) });
	(d.getElementById('lbl-theme') as UIKit.Text)?.setProperties({ text: THEMES[settingsState.themeIdx].name });
}

function updateLeaderboardUI(): void {
	const d = docs['leaderboard'];
	if (!d) return;
	for (let i = 0; i < 10; i++) {
		const el = d.getElementById(`row${i}`) as UIKit.Text;
		if (!el) continue;
		if (i < leaderboard.length) {
			const e = leaderboard[i];
			el.setProperties({ text: `#${i + 1}  ${e.score}pts  ${e.mode}  ${e.name}` });
		} else {
			el.setProperties({ text: `#${i + 1}  ---` });
		}
	}
}

function updateReviewUI(): void {
	const d = docs['review'];
	if (!d) return;

	const pageSize = 8;
	// Collect answered question indices
	const answeredIndices: number[] = [];
	for (let i = 0; i < gs.questions.length; i++) {
		if (gs.results[i] !== undefined) {
			answeredIndices.push(i);
		}
	}

	const totalPages = Math.max(1, Math.ceil(answeredIndices.length / pageSize));
	reviewPage = Math.min(reviewPage, totalPages - 1);
	const startIdx = reviewPage * pageSize;

	for (let i = 0; i < pageSize; i++) {
		const el = d.getElementById(`qr${i}`) as UIKit.Text;
		if (!el) continue;
		const aIdx = startIdx + i;
		if (aIdx < answeredIndices.length) {
			const qi = answeredIndices[aIdx];
			const q = gs.questions[qi];
			const icon = gs.results[qi] ? '[OK]' : '[X]';
			const truncQ = q.question.length > 30 ? q.question.substring(0, 30) + '...' : q.question;
			el.setProperties({ text: `#${aIdx + 1} ${icon} ${truncQ} -> ${q.answers[q.correct]}` });
		} else {
			el.setProperties({ text: '' });
		}
	}

	(d.getElementById('lbl-page') as UIKit.Text)?.setProperties({ text: `${reviewPage + 1}/${totalPages}` });
}

// ============================================================
// THEME APPLICATION
// ============================================================

function applyTheme(idx: number): void {
	const theme = THEMES[idx];
	if (!worldRef) return;

	// Update fog
	const fog = worldRef.scene.fog as FogExp2 | null;
	if (fog) fog.color.setHex(theme.fog);

	// Replace grids
	if (floorGrid) worldRef.scene.remove(floorGrid);
	if (ceilGrid) worldRef.scene.remove(ceilGrid);
	floorGrid = new GridHelper(40, 40, theme.primary, theme.secondary);
	worldRef.scene.add(floorGrid);
	ceilGrid = new GridHelper(40, 40, theme.primary, theme.secondary);
	ceilGrid.position.y = 6;
	worldRef.scene.add(ceilGrid);

	// Update particles
	if (particleMat) particleMat.color.setHex(theme.primary);

	// Update wireframes
	for (const m of wireMats) m.color.setHex(theme.primary);

	// Update lights
	for (const l of sceneLights) l.color.setHex(theme.primary);

	// Background
	if (worldRef.scene.background instanceof Color) {
		worldRef.scene.background.setHex(theme.bg);
	}
}


// ============================================================
// SCENE SETUP
// ============================================================

function setupScene(): void {
	const theme = THEMES[settingsState.themeIdx];
	const scene = worldRef.scene;

	// Background & Fog
	scene.background = new Color(theme.bg);
	scene.fog = new FogExp2(theme.fog, 0.04);

	// Lighting
	const ambient = new AmbientLight(0x222233, 0.6);
	scene.add(ambient);

	const dirLight = new DirectionalLight(0xffffff, 0.3);
	dirLight.position.set(5, 10, 5);
	scene.add(dirLight);

	for (let i = 0; i < 3; i++) {
		const pl = new PointLight(theme.primary, 0.5, 20);
		pl.position.set(
			(i - 1) * 6,
			3 + i * 0.5,
			-2 - i * 2,
		);
		scene.add(pl);
		sceneLights.push(pl);
	}

	// Floor & ceiling grids
	floorGrid = new GridHelper(40, 40, theme.primary, theme.secondary);
	scene.add(floorGrid);
	ceilGrid = new GridHelper(40, 40, theme.primary, theme.secondary);
	ceilGrid.position.y = 6;
	scene.add(ceilGrid);

	// Wireframe decorations
	const geos = [
		new OctahedronGeometry(0.3),
		new TorusGeometry(0.25, 0.08, 8, 12),
		new IcosahedronGeometry(0.25),
		new BoxGeometry(0.35, 0.35, 0.35),
		new SphereGeometry(0.2, 8, 6),
		new OctahedronGeometry(0.2),
		new TorusGeometry(0.2, 0.06, 6, 10),
		new IcosahedronGeometry(0.3),
	];

	for (let i = 0; i < 8; i++) {
		const mat = new LineBasicMaterial({ color: theme.primary, transparent: true, opacity: 0.4 });
		wireMats.push(mat);
		const edges = new EdgesGeometry(geos[i]);
		const lineSegs = new LineSegments(edges, mat);
		const g = new Group();
		g.add(lineSegs);
		const angle = (i / 8) * Math.PI * 2;
		const radius = 3 + Math.random() * 4;
		g.position.set(
			Math.cos(angle) * radius,
			1 + Math.random() * 4,
			Math.sin(angle) * radius - 3,
		);
		scene.add(g);
		wireframeGroups.push(g);
	}

	// Particles (250 pool)
	const count = 250;
	const positions = new Float32Array(count * 3);
	particleSpeeds = [];
	for (let i = 0; i < count; i++) {
		positions[i * 3] = (Math.random() - 0.5) * 30;
		positions[i * 3 + 1] = Math.random() * 6;
		positions[i * 3 + 2] = (Math.random() - 0.5) * 30;
		particleSpeeds.push(0.1 + Math.random() * 0.3);
	}
	particleGeo = new BufferGeometry();
	particleGeo.setAttribute('position', new Float32BufferAttribute(positions, 3));
	particleMat = new PointsMaterial({
		color: theme.primary,
		size: 0.06,
		transparent: true,
		opacity: 0.6,
		blending: AdditiveBlending,
		depthWrite: false,
	});
	const points = new Points(particleGeo, particleMat);
	scene.add(points);

	// Central floating platform (decorative)
	const platGeo = new BoxGeometry(1.6, 0.03, 0.8);
	const platEdges = new EdgesGeometry(platGeo);
	const platMat = new LineBasicMaterial({ color: theme.primary, transparent: true, opacity: 0.3 });
	wireMats.push(platMat);
	const platLines = new LineSegments(platEdges, platMat);
	platLines.position.set(0, 0.5, -1.3);
	scene.add(platLines);
}

// ============================================================
// ECS SYSTEM
// ============================================================

class TriviaSystem extends createSystem({
	uiTitle: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/title.json')] },
	uiMode: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/modeselect.json')] },
	uiCat: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/catpick.json')] },
	uiDiff: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/difficulty.json')] },
	uiQuestion: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/question.json')] },
	uiAnswers: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/answers.json')] },
	uiHud: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/hud.json')] },
	uiPause: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/pause.json')] },
	uiGameover: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/gameover.json')] },
	uiAchv: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/achvlist.json')] },
	uiStats: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/stats.json')] },
	uiSettings: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/settings.json')] },
	uiLeaderboard: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/leaderboard.json')] },
	uiCountdown: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/countdown.json')] },
	uiToast: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/toast.json')] },
	uiHelp: { required: [PanelUI, PanelDocument], where: [eq(PanelUI, 'config', './ui/help.json')] },
}) {
	private selectedMode: GameMode = 'classic';
	private selectedCategory = -1;

	init() {
		// ---- Title ----
		this.queries.uiTitle.subscribe('qualify', (entity: any) => {
			const doc = entity.getValue(PanelDocument, 'document') as UIKitDocument;
			docs['title'] = doc;
			(doc.getElementById('btn-play') as UIKit.Text)?.setProperties({ onClick: () => showScreen('modeselect') });
			(doc.getElementById('btn-scores') as UIKit.Text)?.setProperties({ onClick: () => showScreen('leaderboard') });
			(doc.getElementById('btn-achievements') as UIKit.Text)?.setProperties({ onClick: () => { achvPage = 0; showScreen('achvlist'); } });
			(doc.getElementById('btn-stats') as UIKit.Text)?.setProperties({ onClick: () => showScreen('stats') });
			(doc.getElementById('btn-settings') as UIKit.Text)?.setProperties({ onClick: () => showScreen('settings') });
			(doc.getElementById('btn-help') as UIKit.Text)?.setProperties({ onClick: () => showScreen('help') });
			updateTitleLabels();
		});

		// ---- Mode Select ----
		this.queries.uiMode.subscribe('qualify', (entity: any) => {
			const doc = entity.getValue(PanelDocument, 'document') as UIKitDocument;
			docs['modeselect'] = doc;
			const modes: [string, GameMode][] = [
				['btn-classic', 'classic'], ['btn-speed', 'speed'], ['btn-streak', 'streak'],
				['btn-category', 'category'], ['btn-daily', 'daily'], ['btn-blitz', 'blitz'],
				['btn-marathon', 'marathon'], ['btn-practice', 'practice'],
			];
			for (const [id, mode] of modes) {
				(doc.getElementById(id) as UIKit.Text)?.setProperties({ onClick: () => {
					this.selectedMode = mode;
					if (mode === 'category') {
						showScreen('catpick');
					} else if (mode === 'daily') {
						startGame('daily', 'medium', -1);
					} else {
						showScreen('difficulty');
					}
				} });
			}
			(doc.getElementById('btn-back') as UIKit.Text)?.setProperties({ onClick: () => showScreen('title') });
		});

		// ---- Category Pick ----
		this.queries.uiCat.subscribe('qualify', (entity: any) => {
			const doc = entity.getValue(PanelDocument, 'document') as UIKitDocument;
			docs['catpick'] = doc;
			for (let i = 0; i < 10; i++) {
				const idx = i;
				(doc.getElementById(`btn-cat${i}`) as UIKit.Text)?.setProperties({ onClick: () => {
					this.selectedCategory = idx;
					showScreen('difficulty');
				} });
			}
			// Random category option
			(doc.getElementById('btn-cat-all') as UIKit.Text)?.setProperties({ onClick: () => {
				this.selectedCategory = Math.floor(Math.random() * 10);
				showScreen('difficulty');
			} });
			(doc.getElementById('btn-back') as UIKit.Text)?.setProperties({ onClick: () => showScreen('modeselect') });
		});

		// ---- Difficulty ----
		this.queries.uiDiff.subscribe('qualify', (entity: any) => {
			const doc = entity.getValue(PanelDocument, 'document') as UIKitDocument;
			docs['difficulty'] = doc;
			const diffs: [string, Difficulty][] = [
				['btn-easy', 'easy'], ['btn-medium', 'medium'], ['btn-hard', 'hard'],
			];
			for (const [id, diff] of diffs) {
				(doc.getElementById(id) as UIKit.Text)?.setProperties({ onClick: () => {
					startGame(this.selectedMode, diff, this.selectedCategory);
				} });
			}
			(doc.getElementById('btn-back') as UIKit.Text)?.setProperties({ onClick: () => {
				if (this.selectedMode === 'category') showScreen('catpick');
				else showScreen('modeselect');
			} });
		});

		// ---- Question ----
		this.queries.uiQuestion.subscribe('qualify', (entity: any) => {
			const doc = entity.getValue(PanelDocument, 'document') as UIKitDocument;
			docs['question'] = doc;
		});

		// ---- Answers ----
		this.queries.uiAnswers.subscribe('qualify', (entity: any) => {
			const doc = entity.getValue(PanelDocument, 'document') as UIKitDocument;
			docs['answers'] = doc;
			const btns = ['btn-a', 'btn-b', 'btn-c', 'btn-d'];
			for (let i = 0; i < 4; i++) {
				const idx = i;
				(doc.getElementById(btns[i]) as UIKit.Text)?.setProperties({ onClick: () => selectAnswer(idx) });
			}
			(doc.getElementById('btn-fifty') as UIKit.Text)?.setProperties({ onClick: () => useFiftyFifty() });
			(doc.getElementById('btn-skip') as UIKit.Text)?.setProperties({ onClick: () => useSkip() });
			(doc.getElementById('btn-hint') as UIKit.Text)?.setProperties({ onClick: () => useHint() });
		});

		// ---- HUD ----
		this.queries.uiHud.subscribe('qualify', (entity: any) => {
			const doc = entity.getValue(PanelDocument, 'document') as UIKitDocument;
			docs['hud'] = doc;
		});

		// ---- Pause ----
		this.queries.uiPause.subscribe('qualify', (entity: any) => {
			const doc = entity.getValue(PanelDocument, 'document') as UIKitDocument;
			docs['pause'] = doc;
			(doc.getElementById('btn-resume') as UIKit.Text)?.setProperties({ onClick: () => togglePause() });
			(doc.getElementById('btn-quit') as UIKit.Text)?.setProperties({ onClick: () => {
				gameRunning = false;
				gamePaused = false;
				showScreen('title');
			} });
		});

		// ---- Game Over ----
		this.queries.uiGameover.subscribe('qualify', (entity: any) => {
			const doc = entity.getValue(PanelDocument, 'document') as UIKitDocument;
			docs['gameover'] = doc;
			(doc.getElementById('btn-rematch') as UIKit.Text)?.setProperties({ onClick: () => {
				startGame(gs.mode, gs.difficulty, gs.category);
			} });
			(doc.getElementById('btn-review') as UIKit.Text)?.setProperties({ onClick: () => {
				reviewPage = 0;
				showScreen('review');
			} });
			(doc.getElementById('btn-menu') as UIKit.Text)?.setProperties({ onClick: () => showScreen('title') });
		});

		// ---- Achievements ----
		this.queries.uiAchv.subscribe('qualify', (entity: any) => {
			const doc = entity.getValue(PanelDocument, 'document') as UIKitDocument;
			docs['achvlist'] = doc;
			(doc.getElementById('btn-prev') as UIKit.Text)?.setProperties({ onClick: () => {
				achvPage = Math.max(0, achvPage - 1);
				updateAchievementsUI();
			} });
			(doc.getElementById('btn-next') as UIKit.Text)?.setProperties({ onClick: () => {
				const maxPage = Math.ceil(ACHIEVEMENT_DEFS.length / 15) - 1;
				achvPage = Math.min(maxPage, achvPage + 1);
				updateAchievementsUI();
			} });
			(doc.getElementById('btn-back') as UIKit.Text)?.setProperties({ onClick: () => showScreen('title') });
		});

		// ---- Stats ----
		this.queries.uiStats.subscribe('qualify', (entity: any) => {
			const doc = entity.getValue(PanelDocument, 'document') as UIKitDocument;
			docs['stats'] = doc;
			(doc.getElementById('btn-back') as UIKit.Text)?.setProperties({ onClick: () => showScreen('title') });
		});

		// ---- Settings ----
		this.queries.uiSettings.subscribe('qualify', (entity: any) => {
			const doc = entity.getValue(PanelDocument, 'document') as UIKitDocument;
			docs['settings'] = doc;
			const volAdj = (key: 'masterVol' | 'sfxVol' | 'musicVol', delta: number) => {
				settingsState[key] = Math.max(0, Math.min(100, settingsState[key] + delta));
				saveSettings();
				updateSettingsUI();
			};
			(doc.getElementById('btn-master-down') as UIKit.Text)?.setProperties({ onClick: () => volAdj('masterVol', -10) });
			(doc.getElementById('btn-master-up') as UIKit.Text)?.setProperties({ onClick: () => volAdj('masterVol', 10) });
			(doc.getElementById('btn-sfx-down') as UIKit.Text)?.setProperties({ onClick: () => volAdj('sfxVol', -10) });
			(doc.getElementById('btn-sfx-up') as UIKit.Text)?.setProperties({ onClick: () => volAdj('sfxVol', 10) });
			(doc.getElementById('btn-music-down') as UIKit.Text)?.setProperties({ onClick: () => volAdj('musicVol', -10) });
			(doc.getElementById('btn-music-up') as UIKit.Text)?.setProperties({ onClick: () => volAdj('musicVol', 10) });
			(doc.getElementById('btn-theme-prev') as UIKit.Text)?.setProperties({ onClick: () => {
				settingsState.themeIdx = (settingsState.themeIdx - 1 + THEMES.length) % THEMES.length;
				saveSettings();
				applyTheme(settingsState.themeIdx);
				updateSettingsUI();
			} });
			(doc.getElementById('btn-theme-next') as UIKit.Text)?.setProperties({ onClick: () => {
				settingsState.themeIdx = (settingsState.themeIdx + 1) % THEMES.length;
				saveSettings();
				applyTheme(settingsState.themeIdx);
				updateSettingsUI();
			} });
			(doc.getElementById('btn-reset') as UIKit.Text)?.setProperties({ onClick: () => {
				stats = defaultStats();
				leaderboard = [];
				unlockedAchievements = new Array(40).fill(false);
				saveStats();
				saveLeaderboard();
				saveAchievements();
				showToastMsg('Progress reset!', 2);
				updateSettingsUI();
			} });
			(doc.getElementById('btn-back') as UIKit.Text)?.setProperties({ onClick: () => showScreen('title') });
		});

		// ---- Leaderboard ----
		this.queries.uiLeaderboard.subscribe('qualify', (entity: any) => {
			const doc = entity.getValue(PanelDocument, 'document') as UIKitDocument;
			docs['leaderboard'] = doc;
			(doc.getElementById('btn-back') as UIKit.Text)?.setProperties({ onClick: () => showScreen('title') });
		});

		// ---- Countdown ----
		this.queries.uiCountdown.subscribe('qualify', (entity: any) => {
			const doc = entity.getValue(PanelDocument, 'document') as UIKitDocument;
			docs['countdown'] = doc;
		});

		// ---- Toast ----
		this.queries.uiToast.subscribe('qualify', (entity: any) => {
			const doc = entity.getValue(PanelDocument, 'document') as UIKitDocument;
			docs['toast'] = doc;
		});

		// ---- Help ----
		this.queries.uiHelp.subscribe('qualify', (entity: any) => {
			const doc = entity.getValue(PanelDocument, 'document') as UIKitDocument;
			docs['help'] = doc;
			(doc.getElementById('btn-back') as UIKit.Text)?.setProperties({ onClick: () => showScreen('title') });
		});
	}

	update(delta: number, time: number) {
		// ---- Countdown ----
		if (countdownActive) {
			countdownTimer -= delta;
			const d = docs['countdown'];
			if (d) {
				const num = Math.ceil(countdownTimer);
				const lbl = d.getElementById('lbl-count') as UIKit.Text;
				lbl?.setProperties({ text: num > 0 ? String(num) : 'GO!' });
			}
			if (countdownTimer <= -0.5) {
				countdownActive = false;
				beginPlay();
			}
			return; // Don't process other timers during countdown
		}

		// ---- Toast timer ----
		if (toastTimer > 0) {
			toastTimer -= delta;
			if (toastTimer <= 0) {
				hidePanel('toast');
			}
		}

		// ---- Feedback timer ----
		if (feedbackShowing) {
			feedbackTimer -= delta;
			if (feedbackTimer <= 0) {
				feedbackShowing = false;
				if (gs.mode === 'streak' && gs.combo === 0 && gs.totalAnswered > 0) {
					endGame();
				} else {
					nextQuestion();
				}
			}
		}

		// ---- Game timer ----
		if (gameRunning && !gamePaused && !feedbackShowing) {
			gameElapsed += delta;

			if (gs.mode === 'speed') {
				speedModeTimer -= delta;
				if (speedModeTimer <= 0) {
					speedModeTimer = 0;
					endGame();
					return;
				}
				updateHUD();
			} else if (gs.mode !== 'practice' && gs.mode !== 'streak') {
				gs.timer -= delta;
				if (gs.timer <= 0) {
					gs.timer = 0;
					// Time ran out for this question — treat as wrong
					gs.totalAnswered++;
					gs.results[gs.currentIndex] = false;
					gs.combo = 0;
					gs.streak = 0;
					const question = gs.questions[gs.currentIndex];
					showToastMsg(`Time's up! Answer: ${question.answers[question.correct]}`, 1.5);
					feedbackShowing = true;
					feedbackTimer = 1.5;
				}
				updateHUD();
			}
		}

		// ---- Input ----
		if (gameRunning && !feedbackShowing) {
			const kb = this.world.input.keyboard;
			if (kb.getKeyDown('Digit1')) selectAnswer(0);
			if (kb.getKeyDown('Digit2')) selectAnswer(1);
			if (kb.getKeyDown('Digit3')) selectAnswer(2);
			if (kb.getKeyDown('Digit4')) selectAnswer(3);
			if (kb.getKeyDown('KeyF')) useFiftyFifty();
			if (kb.getKeyDown('KeyS')) useSkip();
			if (kb.getKeyDown('KeyH')) useHint();
			if (kb.getKeyDown('KeyD')) useDoublePoints();
			if (kb.getKeyDown('KeyT')) useTimeFreeze();
			if (kb.getKeyDown('Escape') || kb.getKeyDown('KeyP')) togglePause();

			const rightPad = this.world.input.xr.gamepads.right;
			if (rightPad?.getButtonDown(InputComponent.B_Button)) togglePause();
			if (rightPad?.getButtonDown(InputComponent.A_Button)) useDoublePoints();
		}

		// ---- HUD bounce recovery ----
		if (hudBounceTimer > 0) {
			hudBounceTimer -= delta;
			if (hudBounceTimer <= 0) {
				const hudOv = offsets['hud'];
				if (hudOv) {
					hudOv[1] = PANEL_CONFIGS['hud'].y;
				}
			}
		}

		// ---- Wrong answer flash recovery ----
		if (wrongFlashTimer > 0) {
			wrongFlashTimer -= delta;
			if (wrongFlashTimer <= 0) {
				const theme = THEMES[settingsState.themeIdx];
				for (const l of sceneLights) {
					l.color.setHex(theme.primary);
					l.intensity = 0.5;
				}
			}
		}

		// ---- Animate particles ----
		if (particleGeo) {
			const pos = particleGeo.getAttribute('position');
			if (pos) {
				for (let i = 0; i < particleSpeeds.length; i++) {
					let y = (pos as any).getY(i) + particleSpeeds[i] * delta;
					if (y > 6) y = -0.5;
					(pos as any).setY(i, y);
					const x = (pos as any).getX(i) + Math.sin(time * 0.5 + i) * 0.002;
					(pos as any).setX(i, x);
				}
				(pos as any).needsUpdate = true;
			}
		}

		// ---- Animate wireframes ----
		const wireSpeedMult = streakLevel === 2 ? 3 : streakLevel === 1 ? 2 : 1;
		for (let i = 0; i < wireframeGroups.length; i++) {
			const g = wireframeGroups[i];
			g.rotation.x += (0.15 + i * 0.02) * delta * wireSpeedMult;
			g.rotation.y += (0.2 + i * 0.03) * delta * wireSpeedMult;
			g.position.y += Math.sin(time + i * 1.5) * 0.002;
		}

		// ---- Animate ring ----
		if (sceneRing) {
			const ringSpeedMult = streakLevel === 2 ? 3 : streakLevel === 1 ? 2 : 1;
			sceneRing.rotation.y += 0.15 * delta * ringSpeedMult;
			sceneRing.rotation.x += 0.05 * delta * ringSpeedMult;
		}

		// ---- Animate orbiting lights ----
		for (let i = 0; i < orbitingLights.length; i++) {
			const angle = time * 0.5 + (i / 4) * Math.PI * 2;
			const radius = 3.5;
			orbitingLights[i].position.set(
				Math.cos(angle) * radius,
				2 + Math.sin(time * 0.7 + i * 1.2) * 1.5,
				Math.sin(angle) * radius - 2,
			);
		}

		// ---- Streak visual effects ----
		const newStreakLevel = gs.streak >= 10 ? 2 : gs.streak >= 5 ? 1 : 0;
		if (newStreakLevel !== streakLevel) {
			streakLevel = newStreakLevel;
			if (streakLevel === 2) {
				showToastMsg('UNSTOPPABLE!', 2);
				if (particleMat) {
					particleMat.color.setHex(0xffcc00);
					particleMat.opacity = 0.9;
				}
				// Move some particles closer for spark effect
				if (particleGeo) {
					const pos = particleGeo.getAttribute('position');
					if (pos) {
						for (let pi = 0; pi < 30; pi++) {
							(pos as any).setX(pi, (Math.random() - 0.5) * 6);
							(pos as any).setZ(pi, (Math.random() - 0.5) * 6 - 2);
						}
						(pos as any).needsUpdate = true;
					}
				}
			} else if (streakLevel === 1) {
				showToastMsg('ON FIRE!', 2);
				if (particleMat) {
					particleMat.opacity = 0.9;
					particleMat.color.setHex(defaultParticleColor);
				}
			} else {
				// Reset to defaults
				if (particleMat) {
					particleMat.opacity = 0.6;
					particleMat.color.setHex(defaultParticleColor);
				}
				// Reset particle positions
				if (particleGeo) {
					const pos = particleGeo.getAttribute('position');
					if (pos) {
						for (let pi = 0; pi < 30; pi++) {
							(pos as any).setX(pi, (Math.random() - 0.5) * 30);
							(pos as any).setZ(pi, (Math.random() - 0.5) * 30);
						}
						(pos as any).needsUpdate = true;
					}
				}
			}
		}
	}
}

// ============================================================
// MAIN INITIALIZATION
// ============================================================

async function main() {
	// Load persisted data
	loadStats();
	loadLeaderboard();
	loadAchievements();
	loadSettings();
	loadGameHistory();

	// Create World
	const container = document.getElementById('app') as HTMLDivElement;
	const world = await World.create(container, {
		render: {
			defaultLighting: false, // clearColor handled by setupScene; bg: THEMES[settingsState.themeIdx].bg,
		},
	});
	worldRef = world;

	// Setup 3D scene
	setupScene();

	// Create panel entities
	for (const [name, cfg] of Object.entries(PANEL_CONFIGS)) {
		const e = world.createEntity();
		e.addComponent(PanelUI, { config: cfg.config });
		e.addComponent(Follower, { target: world.player.head });
		const ov = e.getVectorView(Follower, 'offsetPosition');
		ov[0] = 0;
		// Only title starts visible
		ov[1] = name === 'title' ? cfg.y : -100;
		ov[2] = cfg.z;
		offsets[name] = ov as Float32Array;
	}

	// Register system
	world.registerSystem(TriviaSystem);
}

main();
