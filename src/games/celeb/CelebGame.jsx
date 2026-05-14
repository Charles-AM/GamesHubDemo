import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUser } from '../../context/UserContext'

// ── Celebrity pool (90+) ──────────────────────────────────────────────────────
// Hints: cryptic → specific → near-giveaway. Never name the person.
const CELEBS = [
  // ── SPORTS ──
  {
    name: 'Lionel Messi', cat: '⚽ SPORTS',
    hints: [
      'A Spanish club paid for this Argentine teenager\'s hormone treatment — he signed his first contract on a napkin',
      'He has won the Ballon d\'Or a record 8 times throughout his career',
      'He finally lifted the FIFA World Cup with Argentina at Qatar 2022',
    ],
  },
  {
    name: 'Cristiano Ronaldo', cat: '⚽ SPORTS',
    hints: [
      'He left a tiny Atlantic island at age 12 to chase his football dream, crying all the way',
      'He is famous for his "Siuuu!" goal celebration and obsessive fitness regime',
      'He became the first footballer to score 900 career goals, now playing in Saudi Arabia',
    ],
  },
  {
    name: 'LeBron James', cat: '🏀 SPORTS',
    hints: [
      'Sports Illustrated put this 17-year-old on their cover with the headline "The Chosen One"',
      'He won NBA championships with three different franchises across his career',
      'Known as "King James", he also co-owns a media company and an NBA franchise',
    ],
  },
  {
    name: 'Serena Williams', cat: '🎾 SPORTS',
    hints: [
      'She and her sister trained on public courts in Compton, coached by their father',
      'She won the 2017 Australian Open while eight weeks pregnant',
      'She won 23 Grand Slam singles titles — the most by any player in the Open Era',
    ],
  },
  {
    name: 'Michael Jordan', cat: '🏀 SPORTS',
    hints: [
      'He was cut from his high school varsity basketball team as a sophomore',
      'He quit the NBA at his peak to play minor league baseball for two seasons',
      'He won 6 NBA championships with the Chicago Bulls; his story is told in "The Last Dance"',
    ],
  },
  {
    name: 'Tiger Woods', cat: '⛳ SPORTS',
    hints: [
      'He appeared on TV at age 2, putting golf balls on The Mike Douglas Show',
      'He won The Masters by 12 strokes at just 21 years old',
      'After years of back surgeries and a near-fatal car crash, he won his 15th major at Augusta in 2019',
    ],
  },
  {
    name: 'Tom Brady', cat: '🏈 SPORTS',
    hints: [
      'He was the 199th pick — 6th round — in the 2000 NFL Draft, considered too slow and weak',
      'He won Super Bowls with two different NFL teams, 20 years apart',
      'He holds the record for 7 Super Bowl victories — more than any franchise in NFL history',
    ],
  },
  {
    name: 'Usain Bolt', cat: '🏃 SPORTS',
    hints: [
      'Doctors told this Jamaican his scoliosis would hold back his athletic career',
      'He set world records in the 100m AND 200m at the 2008, 2012, and 2016 Olympics',
      'His world record of 9.58 seconds in the 100m sprint has stood since 2009',
    ],
  },
  {
    name: 'Simone Biles', cat: '🤸 SPORTS',
    hints: [
      'Her private medical records were hacked and leaked during the 2016 Olympics, revealing her ADHD diagnosis',
      'She has a gymnastics skill named after her — "The Biles" — rated the hardest in the sport',
      'She withdrew from several events at Tokyo 2020 for mental health, then returned to win gold at Paris 2024',
    ],
  },
  {
    name: 'Roger Federer', cat: '🎾 SPORTS',
    hints: [
      'He was known as a total hothead in his junior years — throwing rackets and arguing with officials',
      'He won 8 Wimbledon titles and 20 Grand Slam titles across his career',
      'He retired in 2022 and played his final professional match alongside his great rival Rafael Nadal at the Laver Cup',
    ],
  },
  {
    name: 'Kobe Bryant', cat: '🏀 SPORTS',
    hints: [
      'He was selected 13th overall straight out of high school in the 1996 NBA Draft',
      'He scored 81 points in a single NBA game in 2006 — second most in history',
      'Known as "The Black Mamba", he won 5 championships with the Los Angeles Lakers',
    ],
  },
  {
    name: 'Michael Phelps', cat: '🏊 SPORTS',
    hints: [
      'He was diagnosed with ADHD at age 9 and his teacher said he\'d never be able to focus on anything',
      'He has won 23 Olympic gold medals — the most of any Olympian in history',
      'He trained under coach Bob Bowman starting at age 11 in Baltimore, Maryland',
    ],
  },
  // ── MUSIC ──
  {
    name: 'Taylor Swift', cat: '🎵 MUSIC',
    hints: [
      'She re-recorded her first six albums to reclaim ownership after a dispute with her old label',
      'Her concert tour became the highest-grossing of all time, topping $1 billion in revenue',
      'She started as a country singer from Pennsylvania and won her first Grammy at age 20',
    ],
  },
  {
    name: 'Beyoncé', cat: '🎵 MUSIC',
    hints: [
      'As a child, she beat an act three times her age in a talent show and her shocked teacher accused her of lip-syncing',
      'She was part of one of the best-selling girl groups of all time before launching her solo career',
      'Her "Lemonade" and "Renaissance" albums both broke streaming and sales records',
    ],
  },
  {
    name: 'Drake', cat: '🎵 MUSIC',
    hints: [
      'Before rap, he played a wheelchair-using student named Jimmy Brooks on a Canadian teen drama',
      'He holds the record for most songs ever charted on the Billboard Hot 100',
      'He\'s from Toronto and coined the nickname "the 6ix" for the city',
    ],
  },
  {
    name: 'Rihanna', cat: '🎵 MUSIC',
    hints: [
      'She was discovered at 15 singing in her backyard in Barbados by a music producer',
      'She launched Fenty Beauty in 2017, praised for including 40 foundation shades from the start',
      'She performed at the Super Bowl halftime show in 2023 — and revealed she was pregnant mid-performance',
    ],
  },
  {
    name: 'Ed Sheeran', cat: '🎵 MUSIC',
    hints: [
      'As a teenager he slept rough on the London Underground trying to make it as a musician',
      'He has a noticeable scar on his cheek — from a sword accidentally wielded by Princess Beatrice at a party',
      '"Shape of You" and "Perfect" are among Spotify\'s most streamed songs of all time',
    ],
  },
  {
    name: 'Adele', cat: '🎵 MUSIC',
    hints: [
      'She was signed to her first record deal after a friend secretly posted her demo on MySpace',
      'Her album "21" spent 24 weeks at #1 in the UK — the longest for a solo female artist',
      'She names every album after the age she was when she wrote it: 19, 21, 25, 30',
    ],
  },
  {
    name: 'Eminem', cat: '🎵 MUSIC',
    hints: [
      'He entered rap battles in Detroit as a teenager and was often the only white competitor on stage',
      'His alter ego "Slim Shady" debuted on his breakthrough second album in 1999',
      'His semi-autobiographical film "8 Mile" won the Oscar for Best Original Song',
    ],
  },
  {
    name: 'Lady Gaga', cat: '🎵 MUSIC',
    hints: [
      'She attended the same prestigious New York school as Paris Hilton and was accepted to NYU\'s Tisch School',
      'She wore a dress made entirely of raw meat to the 2010 MTV Video Music Awards',
      'She starred alongside Bradley Cooper in the 2018 remake of "A Star Is Born" and won an Oscar for Best Original Song',
    ],
  },
  {
    name: 'Billie Eilish', cat: '🎵 MUSIC',
    hints: [
      'She wrote her debut hit "Ocean Eyes" at just 13 years old and posted it online for free',
      'She became the youngest artist ever to win all four main Grammy categories in one night',
      'Almost all of her music is produced by her older brother in their family home studio',
    ],
  },
  {
    name: 'Justin Bieber', cat: '🎵 MUSIC',
    hints: [
      'A talent manager discovered him at age 13 after stumbling onto his YouTube covers while searching for another artist',
      'His debut single "Baby" was YouTube\'s most-disliked video for years',
      'He\'s from Stratford, Ontario, Canada and was mentored early in his career by Usher',
    ],
  },
  {
    name: 'Bruno Mars', cat: '🎵 MUSIC',
    hints: [
      'He performed as a child Elvis impersonator in Hawaii and was featured in a local newspaper',
      'He wrote mega-hits for other artists — including "Nothin\' on You" and "Billionaire" — before his own debut',
      'He performed at the Super Bowl 50 halftime show and later headlined Las Vegas residencies at the Park MGM',
    ],
  },
  // ── FILM & TV ──
  {
    name: 'Tom Hanks', cat: '🎬 FILM & TV',
    hints: [
      'He is the only actor to win back-to-back Academy Awards for Best Actor',
      'He played a man stranded on an island for years with only a volleyball named Wilson for company',
      'He voiced the cowboy hero of a beloved Pixar animated franchise across four films',
    ],
  },
  {
    name: 'Dwayne Johnson', cat: '🎬 FILM & TV',
    hints: [
      'At 23 he had just $7 in his pocket after being cut from the Canadian Football League',
      'He played college football at the University of Miami before becoming a professional wrestler',
      'Known as "The Rock", he became one of Hollywood\'s highest-paid actors of the 2010s and 2020s',
    ],
  },
  {
    name: 'Leonardo DiCaprio', cat: '🎬 FILM & TV',
    hints: [
      'His mother named him after the Renaissance artist when she felt him kick while looking at a Da Vinci painting',
      'He received four Oscar nominations before finally winning Best Actor for "The Revenant" in 2016',
      'He starred opposite Kate Winslet in James Cameron\'s 1997 epic blockbuster set on a doomed ocean liner',
    ],
  },
  {
    name: 'Oprah Winfrey', cat: '🎬 FILM & TV',
    hints: [
      'She was fired from her first TV job as a reporter and told she was "unfit for television"',
      'She became the first Black female billionaire in North America',
      'Her book club recommendations could launch unknown authors to instant bestseller status overnight',
    ],
  },
  {
    name: 'Will Smith', cat: '🎬 FILM & TV',
    hints: [
      'He began his career as a rapper called "The Fresh Prince" before starring in a sitcom of the same name',
      'He slapped a presenter live on stage at the 2022 Academy Awards',
      'He received Oscar nominations for portraying Muhammad Ali and Venus & Serena Williams\' father',
    ],
  },
  {
    name: 'Jennifer Aniston', cat: '🎬 FILM & TV',
    hints: [
      'Her father is soap opera actor John Aniston, famous for Days of Our Lives',
      'She played Rachel Green in one of the most-watched sitcoms of the 1990s',
      'Her character\'s layered haircut became a global phenomenon — salons worldwide were flooded with requests for "The Rachel"',
    ],
  },
  {
    name: 'Ryan Reynolds', cat: '🎬 FILM & TV',
    hints: [
      'He was born and raised in Vancouver, Canada, one of four brothers',
      'He co-owns Aviation American Gin and bought Welsh football club Wrexham AFC with a friend',
      'He plays the wisecracking, fourth-wall-breaking Marvel antihero Deadpool',
    ],
  },
  {
    name: 'Meryl Streep', cat: '🎬 FILM & TV',
    hints: [
      'She has received more Oscar nominations than any other actor in history — 21 total',
      'She learned Polish for "Sophie\'s Choice" and a New Zealand accent for "A Cry in the Dark"',
      'She played the terrifying fashion magazine editor Miranda Priestly in "The Devil Wears Prada"',
    ],
  },
  {
    name: 'Brad Pitt', cat: '🎬 FILM & TV',
    hints: [
      'Before his big break he drove a limo and wore a chicken costume outside a fast-food restaurant',
      'He starred in "Fight Club", the "Ocean\'s Eleven" trilogy, and "Inglourious Basterds"',
      'He and Angelina Jolie were one of the most famous celebrity couples in the world, known as "Brangelina"',
    ],
  },
  {
    name: 'Scarlett Johansson', cat: '🎬 FILM & TV',
    hints: [
      'She made her film debut aged 9 in the Rob Reiner comedy "North"',
      'She played a super-spy from Budapest in the Marvel Cinematic Universe for over a decade',
      'She sued Disney in 2021 over releasing her solo film simultaneously on streaming and in cinemas',
    ],
  },
  {
    name: 'Kevin Hart', cat: '🎬 FILM & TV',
    hints: [
      'He started doing stand-up in Philadelphia, where clubs would sometimes pay him not to perform',
      'He is notably short for a leading man — a recurring subject in his own comedy',
      'He starred in "Ride Along", "Jumanji: Welcome to the Jungle", and "Central Intelligence"',
    ],
  },
  {
    name: 'Zendaya', cat: '🎬 FILM & TV',
    hints: [
      'She started as a backup dancer and model before landing a role on a Disney Channel show',
      'She became the youngest actress to win the Emmy for Outstanding Lead Actress in a Drama Series',
      'She plays Rue in "Euphoria" and starred in "Dune" and "Challengers"',
    ],
  },
  {
    name: 'Shaquille O\'Neal', cat: '🏀 SPORTS',
    hints: [
      'He completed a doctorate in education from Barry University in 2012',
      'He released four rap albums and starred in movies including "Kazaam" and "Blue Chips"',
      'Known as "Shaq", he won four NBA championships and played for six different teams in his career',
    ],
  },
  {
    name: 'Cardi B', cat: '🎵 MUSIC',
    hints: [
      'She went viral on Instagram and was cast in a reality TV show before ever releasing music',
      'She became the first solo female rapper to score multiple #1 hits on the Billboard Hot 100',
      '"Bodak Yellow" made her the first female rapper to top the Billboard Hot 100 solo in 19 years',
    ],
  },
  {
    name: 'Post Malone', cat: '🎵 MUSIC',
    hints: [
      'He moved from Syracuse to Dallas to Los Angeles and recorded his debut track in 30 minutes on GarageBand',
      'He is heavily tattooed including on his face, and has a prominent "Always Tired" tattoo under his eyes',
      '"Rockstar", "Sunflower", and "Circles" are among his biggest global hits',
    ],
  },

  // ── MORE SPORTS ──
  {
    name: 'Novak Djokovic', cat: '🎾 SPORTS',
    hints: [
      'He trained in a bombed-out swimming pool in Belgrade during the NATO bombing of his country',
      'He is the first player to win each of the four Grand Slam tournaments at least three times',
      'He has won 24 Grand Slam titles — the most in men\'s tennis history',
    ],
  },
  {
    name: 'Rafael Nadal', cat: '🎾 SPORTS',
    hints: [
      'He naturally plays right-handed but his uncle-coach trained him to play left-handed as a child',
      'He won the French Open a record 14 times, earning the nickname "King of Clay"',
      'He formed the famous "Big Three" era of men\'s tennis alongside Federer and Djokovic',
    ],
  },
  {
    name: 'Lewis Hamilton', cat: '🏎️ SPORTS',
    hints: [
      'As a child he financed his karting career partly by collecting shopping trolleys',
      'He is the first and only Black driver to compete in Formula 1',
      'He won 7 Formula 1 World Championships — tied for the most in history — and moved to Ferrari for 2025',
    ],
  },
  {
    name: 'Conor McGregor', cat: '🥊 SPORTS',
    hints: [
      'He was working as a plumber\'s apprentice in Dublin before his UFC breakthrough',
      'He became the first UFC fighter to hold two championship belts at the same time',
      'He crossed over to boxing to face Floyd Mayweather in one of the highest-grossing fights in history',
    ],
  },
  {
    name: 'Stephen Curry', cat: '🏀 SPORTS',
    hints: [
      'He was so unimpressive in high school that his dream college wouldn\'t offer him a scholarship',
      'He revolutionised basketball by making the long-range three-pointer the sport\'s deadliest weapon',
      'He won 4 NBA championships with the Golden State Warriors and is considered the greatest shooter in NBA history',
    ],
  },
  {
    name: 'Giannis Antetokounmpo', cat: '🏀 SPORTS',
    hints: [
      'Born in Greece to Nigerian parents, he and his brothers sold trinkets on the streets of Athens to help the family',
      'He was drafted 15th overall in 2013 and nearly cut during his first NBA season',
      'Known as "The Greek Freak", he won back-to-back MVP awards and an NBA championship with the Milwaukee Bucks',
    ],
  },
  {
    name: 'Naomi Osaka', cat: '🎾 SPORTS',
    hints: [
      'She sparked a global conversation about athlete mental health when she withdrew from the French Open in 2021',
      'She lit the Olympic cauldron at the Tokyo 2020 opening ceremony in her home country',
      'Born to a Japanese mother and Haitian father, she has won 4 Grand Slam titles',
    ],
  },
  {
    name: 'Muhammad Ali', cat: '🥊 SPORTS',
    hints: [
      'He threw his Olympic gold medal into a river after being refused service at a diner in his hometown',
      'He was stripped of his world title and banned from boxing for refusing to be drafted into the Vietnam War',
      'Born Cassius Clay, he is widely considered the greatest boxer of all time — and he said so himself',
    ],
  },
  {
    name: 'Mike Tyson', cat: '🥊 SPORTS',
    hints: [
      'He had been in juvenile detention facilities 38 times before a counsellor introduced him to boxing at 13',
      'He became the youngest heavyweight champion in boxing history at just 20 years old',
      'He bit off a piece of Evander Holyfield\'s ear during their infamous 1997 rematch',
    ],
  },
  {
    name: 'Ronaldinho', cat: '⚽ SPORTS',
    hints: [
      'He was once briefly detained in Paraguay on a passport issue — locals reportedly couldn\'t believe who they had',
      'He won the FIFA World Player of the Year award back-to-back in 2004 and 2005',
      'Famous for his dazzling dribbling and joyful style, he was the heartbeat of a golden era Barcelona squad',
    ],
  },
  {
    name: 'Zlatan Ibrahimović', cat: '⚽ SPORTS',
    hints: [
      'He grew up in one of the toughest suburbs of Malmö, Sweden, born to Bosnian and Croatian immigrant parents',
      'He is famous for referring to himself in the third person and once said "I don\'t need to train. I am Zlatan."',
      'He played in seven different countries\' top leagues and scored over 500 career goals',
    ],
  },
  {
    name: 'Pelé', cat: '⚽ SPORTS',
    hints: [
      'He signed his first professional contract at just 15 years old, wearing boots that didn\'t fit',
      'He is the only footballer ever to win three FIFA World Cups',
      'Born Edson Arantes do Nascimento, he is widely considered the greatest footballer of all time',
    ],
  },
  {
    name: 'Floyd Mayweather', cat: '🥊 SPORTS',
    hints: [
      'He grew up watching his father train fighters while his dad was in prison; his uncle Roger taught him to box',
      'He retired from professional boxing with a perfect unbeaten record',
      'Known as "Money Mayweather", he earned hundreds of millions per fight across a 21-year career ending 50-0',
    ],
  },
  {
    name: 'Kevin Durant', cat: '🏀 SPORTS',
    hints: [
      'A youth coach once told him he\'d never make it because he was "too skinny to play in the NBA"',
      'His decision to leave the Oklahoma City Thunder and join Golden State caused massive controversy in the NBA',
      'He has won 2 NBA championships, 2 Olympic golds, and is considered one of the greatest scorers in basketball history',
    ],
  },
  {
    name: 'Venus Williams', cat: '🎾 SPORTS',
    hints: [
      'She and her sister were coached entirely by their father — no tennis academy, just a public court in Compton',
      'She was instrumental in lobbying Wimbledon and the French Open to award equal prize money to women',
      'She has won 7 Grand Slam singles titles and 14 doubles titles — mostly alongside her younger sister',
    ],
  },
  {
    name: 'Kobe Bryant', cat: '🏀 SPORTS',
    hints: [
      'He was selected 13th overall straight out of high school in the 1996 NBA Draft',
      'He scored 81 points in a single game against the Toronto Raptors in 2006 — second most in NBA history',
      'Known as "The Black Mamba", he won 5 NBA championships with the Los Angeles Lakers',
    ],
  },
  {
    name: 'Michael Phelps', cat: '🏊 SPORTS',
    hints: [
      'He was diagnosed with ADHD at age 9; his teacher told his mother he\'d never be able to focus on anything',
      'He has 23 Olympic gold medals — the most of any Olympian in history',
      'He trained under coach Bob Bowman from age 11 in Baltimore and dominated swimming for three Olympic cycles',
    ],
  },
  {
    name: 'Caitlin Clark', cat: '🏀 SPORTS',
    hints: [
      'She became the all-time leading scorer in NCAA basketball history, breaking a 44-year-old record',
      'Her college games regularly drew higher TV ratings than NBA playoff matches',
      'She was the #1 overall pick in the 2024 WNBA Draft and plays for the Indiana Fever',
    ],
  },
  {
    name: 'Sha\'Carri Richardson', cat: '🏃 SPORTS',
    hints: [
      'She learned of her biological mother\'s death from a reporter just before a race at the US Olympic Trials',
      'She was suspended from the Tokyo Olympics after a positive test, turning her story into one of sport\'s most debated',
      'She bounced back to win gold at the Paris 2024 Olympics in the women\'s 100m sprint',
    ],
  },
  {
    name: 'Ronda Rousey', cat: '🥊 SPORTS',
    hints: [
      'She became the first American woman to win an Olympic medal in judo in 2008',
      'She went undefeated in the UFC for years and is credited with almost single-handedly creating women\'s MMA',
      'After her UFC career ended, she transitioned to professional wrestling with WWE',
    ],
  },
  {
    name: 'Sidney Crosby', cat: '🏒 SPORTS',
    hints: [
      'He was so dominant in junior hockey that rival teams lobbied for special rules to limit his effectiveness',
      'He became the youngest captain of an NHL team at just 19 and was the #1 draft pick in 2005',
      'He has won 3 Stanley Cups with the Pittsburgh Penguins and led Canada to two Olympic gold medals',
    ],
  },
  {
    name: 'Canelo Álvarez', cat: '🥊 SPORTS',
    hints: [
      'Born into a large family of boxers in Guadalajara, Mexico, he turned professional at just 15',
      'He became the first boxer to be undisputed champion in a weight class in the four-belt era',
      'Recognisable by his red hair, he is the highest-paid Mexican athlete in history and one of boxing\'s biggest draws',
    ],
  },
  {
    name: 'Neymar Jr.', cat: '⚽ SPORTS',
    hints: [
      'He grew up in poverty in São Paulo state; his father quit work to manage his career from age 11',
      'He became the most expensive transfer in football history when PSG bought him for €222 million in 2017',
      'He played in Messi and Suárez\'s iconic front three at Barcelona before moving to Paris and later Saudi Arabia',
    ],
  },
  {
    name: 'Wayne Gretzky', cat: '🏒 SPORTS',
    hints: [
      'His father built a backyard ice rink for him; he would practise alone until 11 o\'clock at night',
      'He scored more career goals than any player in NHL history — AND more assists than any player scored total points',
      'Known simply as "The Great One", he won 4 Stanley Cups with the Edmonton Oilers',
    ],
  },

  // ── MORE MUSIC ──
  {
    name: 'Shakira', cat: '🎵 MUSIC',
    hints: [
      'She wrote her first poem at age 4 and composed her first song at 8, inspired by her father\'s typewriter',
      'She performed the Super Bowl LIV halftime show alongside another Latin superstar',
      'From Barranquilla, Colombia, she is the best-selling Latin music artist of all time',
    ],
  },
  {
    name: 'Nicki Minaj', cat: '🎵 MUSIC',
    hints: [
      'She was fired from multiple waitressing jobs — including Red Lobster — for being "rude to customers"',
      'She was the first solo female rapper to have 7 songs charting simultaneously on the Billboard Hot 100',
      'Born in Trinidad and Tobago, raised in Queens, New York — she calls herself the "Queen of Rap"',
    ],
  },
  {
    name: 'Kendrick Lamar', cat: '🎵 MUSIC',
    hints: [
      'He grew up in Compton, California — the same streets he raps about — and witnessed a murder at age 5',
      'He became the first rapper to win the Pulitzer Prize for Music in 2018',
      'His 2024 diss track aimed at Drake became one of the most viral rap songs ever released',
    ],
  },
  {
    name: 'Jay-Z', cat: '🎵 MUSIC',
    hints: [
      'He grew up in the Marcy Houses housing project in Brooklyn and sold drugs as a teenager to survive',
      'After every major label rejected him, he co-founded his own and distributed records from his car',
      'He became the first rapper to become a billionaire and is married to Beyoncé',
    ],
  },
  {
    name: 'Kanye West', cat: '🎵 MUSIC',
    hints: [
      'He recorded his debut single while his jaw was still wired shut after a near-fatal 2002 car crash',
      'He grabbed the microphone from a young singer\'s hands during her acceptance speech at the 2009 VMAs',
      'He ran for US President in 2020 and later legally changed his name to Ye',
    ],
  },
  {
    name: 'Ariana Grande', cat: '🎵 MUSIC',
    hints: [
      'A terrorist attack at her concert in Manchester in 2017 killed 22 fans; she returned weeks later to headline a benefit show',
      'Her vocal range spans four octaves and she has cited Mariah Carey as her biggest influence',
      'She starred in the long-awaited Broadway musical and film adaptation of "Wicked"',
    ],
  },
  {
    name: 'The Weeknd', cat: '🎵 MUSIC',
    hints: [
      'He dropped out of school and slept on friends\' floors while uploading music anonymously to YouTube',
      'He performed at the Super Bowl LV halftime show wearing a red jacket and a face covered in bandages',
      'Born Abel Tesfaye in Toronto, his albums "Starboy" and "After Hours" are streamed billions of times',
    ],
  },
  {
    name: 'Bad Bunny', cat: '🎵 MUSIC',
    hints: [
      'He packed groceries at a Supermercado in Puerto Rico while uploading music to SoundCloud in his spare time',
      'He became the first non-English language artist to be Spotify\'s most-streamed artist globally — three years in a row',
      'Born Benito Martínez Ocasio, he is the biggest name in Latin trap and reggaeton worldwide',
    ],
  },
  {
    name: 'Harry Styles', cat: '🎵 MUSIC',
    hints: [
      'He auditioned alone on a TV talent show and was brought back to compete as part of a group instead',
      'His debut solo album and follow-up "Fine Line" both opened at #1 on the charts',
      '"As It Was" was the most-streamed song globally in 2022 and he starred in the film "Don\'t Worry Darling"',
    ],
  },
  {
    name: 'Dua Lipa', cat: '🎵 MUSIC',
    hints: [
      'She moved from London to Kosovo as a teenager, then returned to London alone at 15 to chase a music career',
      'Her album "Future Nostalgia" — released during lockdown — became one of the bestselling albums of 2020',
      'She won the Grammy for Best New Artist in 2019 and is known for her retro-pop sound',
    ],
  },
  {
    name: 'Olivia Rodrigo', cat: '🎵 MUSIC',
    hints: [
      'She wrote her debut single about a heartbreak she experienced as a teenager and finished it in one afternoon',
      'That debut single broke multiple Spotify records and debuted simultaneously at #1 in multiple countries',
      'She starred in a Disney+ series about a high school musical before her own music career exploded',
    ],
  },
  {
    name: 'Lil Nas X', cat: '🎵 MUSIC',
    hints: [
      'He ran a hugely popular Nicki Minaj fan account on Twitter before anyone knew his real name',
      '"Old Town Road" spent 19 weeks at #1 on the Billboard Hot 100 — the longest run in the chart\'s history',
      'He came out as gay on the last day of Pride Month 2019, becoming one of music\'s most prominent LGBTQ+ voices',
    ],
  },
  {
    name: 'Snoop Dogg', cat: '🎵 MUSIC',
    hints: [
      'He was arrested for drug possession the very day after his high school graduation',
      'Mentored by Dr. Dre, his debut album "Doggystyle" became one of the fastest-selling rap albums ever',
      'In 2024, he served as an NBC correspondent and commentator at the Paris Olympics',
    ],
  },
  {
    name: 'Travis Scott', cat: '🎵 MUSIC',
    hints: [
      'He snuck into South by Southwest festival multiple years in a row before anyone knew who he was',
      'He faced lawsuits and intense public scrutiny following a deadly crowd crush at his Astroworld festival in Houston',
      'He has signature collaborations with McDonald\'s and Nike\'s Air Jordan brand worth hundreds of millions',
    ],
  },
  {
    name: 'Doja Cat', cat: '🎵 MUSIC',
    hints: [
      'Her breakthrough viral hit "Mooo!" — where she raps about being a cow — was made as a joke in a few hours',
      'She was studying to be a music producer before deciding to start performing her own material',
      'She has won Grammy awards and charted globally with "Say So", "Kiss Me More", and "Woman"',
    ],
  },
  {
    name: 'SZA', cat: '🎵 MUSIC',
    hints: [
      'She was a competitive gymnast and studied marine biology before pivoting to music',
      'Her debut album "Ctrl" was named one of the best albums of 2017 despite minimal promotion',
      '"Kill Bill" and "Snooze" from her album "SOS" made her 2023\'s most-streamed female artist on Spotify',
    ],
  },
  {
    name: 'Bruno Mars', cat: '🎵 MUSIC',
    hints: [
      'He performed as a child Elvis impersonator in Hawaii and was featured in local newspapers as a toddler',
      'He wrote mega-hits for other artists — including "Nothin\' on You" and "Billionaire" — before releasing his own debut',
      'He headlined multiple Las Vegas residencies at Park MGM and performed at Super Bowl 50\'s halftime show',
    ],
  },
  {
    name: 'Lizzo', cat: '🎵 MUSIC',
    hints: [
      'She has played classical flute since age 10 and often incorporates it into her live performances',
      'She moved from Houston to Minneapolis to Minneapolis to pursue music, at times living out of her car',
      '"Truth Hurts" and "About Damn Time" made her one of the most streamed artists of her era',
    ],
  },
  {
    name: 'Selena Gomez', cat: '🎵 MUSIC',
    hints: [
      'She was discovered at age 7 through open auditions and appeared alongside Barney the dinosaur',
      'She received a kidney transplant in 2017 from her best friend following a battle with lupus',
      'She was the most followed person on Instagram for years and starred in "Only Murders in the Building"',
    ],
  },

  // ── MORE FILM & TV ──
  {
    name: 'Robert Downey Jr.', cat: '🎬 FILM & TV',
    hints: [
      'He served time in prison for drug offences and was considered completely uninsurable by Hollywood studios',
      'He made one of cinema\'s greatest comebacks, eventually becoming Hollywood\'s highest-paid actor',
      'He played Tony Stark / Iron Man in over 10 Marvel films and launched the entire MCU',
    ],
  },
  {
    name: 'Angelina Jolie', cat: '🎬 FILM & TV',
    hints: [
      'She and her first husband famously wore vials of each other\'s blood around their necks',
      'She won an Oscar for "Girl, Interrupted" and became a UN Goodwill Ambassador, later a Special Envoy',
      'She played Lara Croft in "Tomb Raider" and the villain-turned-hero in "Maleficent"',
    ],
  },
  {
    name: 'Johnny Depp', cat: '🎬 FILM & TV',
    hints: [
      'He dropped out of high school to be a rock musician; an actor friend convinced him to audition instead',
      'He regularly visited children\'s hospitals in full costume as his most iconic character',
      'He played Captain Jack Sparrow in the "Pirates of the Caribbean" franchise across five films',
    ],
  },
  {
    name: 'Samuel L. Jackson', cat: '🎬 FILM & TV',
    hints: [
      'He was in his 40s before his breakthrough role — he had battled a crack cocaine addiction for years before getting clean',
      'He appeared in 9 Quentin Tarantino films and holds the record for highest cumulative box office of any actor',
      'He plays Nick Fury in the Marvel Cinematic Universe and is known for his explosive, profanity-laced delivery',
    ],
  },
  {
    name: 'Denzel Washington', cat: '🎬 FILM & TV',
    hints: [
      'He was failing out of college and dropped pre-med before discovering acting in a campus play',
      'He won Best Supporting Actor for "Glory" and Best Actor for "Training Day" at the Oscars',
      'He has played Malcolm X, a corrupt cop, and an avenging assassin — always with the same commanding intensity',
    ],
  },
  {
    name: 'Keanu Reeves', cat: '🎬 FILM & TV',
    hints: [
      'He lost his best friend, then a stillborn child, then his girlfriend — all within three tragic years',
      'Despite being one of the world\'s biggest stars, he is regularly photographed giving up his subway seat to strangers',
      'He played Neo in "The Matrix" trilogy and became an action icon again in the "John Wick" franchise',
    ],
  },
  {
    name: 'Jim Carrey', cat: '🎬 FILM & TV',
    hints: [
      'As a teenager he worked night-shift janitorial jobs to help support his family who was living in a van',
      'He wrote himself a $10 million cheque for "acting services rendered" and kept it in his wallet — then earned it',
      'He starred in "The Mask", "Ace Ventura", "The Truman Show", and "Eternal Sunshine of the Spotless Mind"',
    ],
  },
  {
    name: 'Jackie Chan', cat: '🎬 FILM & TV',
    hints: [
      'He studied at the China Drama Academy from age 7, training for 10 hours a day, six days a week',
      'He performs all his own stunts and has broken nearly every bone in his body at some point during filming',
      'Known for mixing martial arts with physical comedy, he starred in the "Rush Hour" and "Police Story" franchises',
    ],
  },
  {
    name: 'Julia Roberts', cat: '🎬 FILM & TV',
    hints: [
      'She was turned down for a role in "Dirty Dancing" before landing her own breakthrough',
      'She became the first actress to earn $20 million for a single film — for "Erin Brockovich"',
      'She starred in "Pretty Woman", "My Best Friend\'s Wedding", "Ocean\'s Eleven", and won an Oscar for "Erin Brockovich"',
    ],
  },
  {
    name: 'Margot Robbie', cat: '🎬 FILM & TV',
    hints: [
      'She was raised on a farm in Queensland, Australia, and grew up without electricity for part of her childhood',
      'She co-founded her own production company, LuckyChap Entertainment, in her 20s',
      'She played Harley Quinn in multiple DC films and the lead role in 2023\'s record-breaking "Barbie"',
    ],
  },
  {
    name: 'Timothée Chalamet', cat: '🎬 FILM & TV',
    hints: [
      'He had tiny roles in "Homeland" and "Curb Your Enthusiasm" long before his breakthrough',
      'He became the third-youngest Best Actor Oscar nominee ever for his role in "Call Me by Your Name"',
      'He plays Paul Atreides in "Dune" and portrayed Willy Wonka in the prequel film "Wonka"',
    ],
  },
  {
    name: 'Pedro Pascal', cat: '🎬 FILM & TV',
    hints: [
      'He was nearly homeless in New York, working as a waiter for years while waiting for his acting break',
      'He played the doomed Red Viper in "Game of Thrones" before landing his first lead roles',
      'He plays the titular bounty hunter in "The Mandalorian" and the lead in HBO\'s "The Last of Us"',
    ],
  },
  {
    name: 'Chris Hemsworth', cat: '🎬 FILM & TV',
    hints: [
      'Before his Hollywood break he was eliminated early from the Australian version of Dancing with the Stars',
      'He beat out hundreds of actors — including his own brother — for the role of a Norse god',
      'He plays Thor in the Marvel Cinematic Universe and also starred in the action film "Extraction"',
    ],
  },
  {
    name: 'Eddie Murphy', cat: '🎬 FILM & TV',
    hints: [
      'He joined Saturday Night Live at age 19 as one of its youngest ever cast members',
      'He voiced a wisecracking talking donkey in one of the biggest animated franchises of all time',
      'He starred in "Beverly Hills Cop", "Coming to America", and "Trading Places"',
    ],
  },
  {
    name: 'Adam Sandler', cat: '🎬 FILM & TV',
    hints: [
      'He was fired from Saturday Night Live after 5 seasons, then went on to build a billion-dollar comedy empire',
      'He shocked critics with his dramatic performances in "Uncut Gems" and "Punch-Drunk Love"',
      'His Netflix deal is one of the most lucrative in streaming history, releasing several films per year',
    ],
  },
  {
    name: 'Chris Pratt', cat: '🎬 FILM & TV',
    hints: [
      'He was homeless and living in a van in Maui, working as a waiter, when a filmmaker spotted him and offered him a role',
      'He dramatically transformed his body — losing 60 pounds — to play a Marvel superhero after years of chubby sidekick roles',
      'He plays Star-Lord in "Guardians of the Galaxy" and Owen Grady in the "Jurassic World" franchise',
    ],
  },
  {
    name: 'Morgan Freeman', cat: '🎬 FILM & TV',
    hints: [
      'He didn\'t achieve mainstream Hollywood success until his 50s, spending decades in theater and minor TV roles',
      'He has played God so many times it has become a pop culture joke',
      'He starred in "The Shawshank Redemption", "Se7en", "Million Dollar Baby", and "Bruce Almighty"',
    ],
  },

  // ── POP CULTURE / TV ──
  {
    name: 'Kim Kardashian', cat: '📱 POP CULTURE',
    hints: [
      'She first became famous as the personal stylist and best friend of another celebrity heiress',
      'A 2007 reality TV show about her family launched an empire worth billions of dollars',
      'She passed the California baby bar exam in 2021 while studying to become a criminal justice lawyer',
    ],
  },
  {
    name: 'Gordon Ramsay', cat: '🍳 TV / CHEF',
    hints: [
      'He was a promising professional footballer close to signing with Rangers FC before a knee injury ended his career',
      'He earned his third Michelin star at 33, becoming one of the youngest chefs ever to reach that milestone',
      'He is known for his withering honesty on "Hell\'s Kitchen", "MasterChef", and "Kitchen Nightmares"',
    ],
  },
  {
    name: 'Ellen DeGeneres', cat: '📺 TV',
    hints: [
      'She came out publicly on the cover of Time magazine in 1997, at significant career risk',
      'Her talk show ran for 19 seasons and made her one of the most recognisable hosts in television history',
      'She voiced a forgetful fish named Dory in one of Pixar\'s most beloved animated films',
    ],
  },
  {
    name: 'David Beckham', cat: '⚽ SPORTS',
    hints: [
      'He scored from the halfway line on the opening day of the Premier League season — at just 20 years old',
      'He married a member of one of the biggest pop groups of the 1990s and became a global fashion icon',
      'He co-founded Inter Miami CF and lured one of football\'s greatest players to join the club',
    ],
  },
  {
    name: 'Cristiano Ronaldo', cat: '⚽ SPORTS',
    hints: [
      'He left a tiny Atlantic island at age 12 to chase his football dream, crying all the way to the mainland',
      'He is famous for his "Siuuu!" goal celebration and obsessive fitness regime — reportedly 5% body fat',
      'He became the first footballer to score 900 career goals, currently playing in Saudi Arabia',
    ],
  },
  {
    name: 'Serena Williams', cat: '🎾 SPORTS',
    hints: [
      'She and her sister trained on public courts in Compton, California, with their father as sole coach',
      'She won the 2017 Australian Open while eight weeks pregnant',
      'She won 23 Grand Slam singles titles — the most by any player in the Open Era',
    ],
  },
  {
    name: 'Beyoncé', cat: '🎵 MUSIC',
    hints: [
      'As a child she beat an act three times her age in a talent show; her shocked teacher accused her of lip-syncing',
      'She was part of one of the best-selling girl groups of all time before launching her solo career',
      'Her albums "Lemonade" and "Renaissance" both broke streaming and cultural records on release',
    ],
  },
]

// ── Difficulty config ──────────────────────────────────────────────────────────
const DIFF = {
  easy:   { questionSec: 22, hintsShown: 0, autoReveal: true,  allowReveal: true,  bonusPts: 5,  streakAt: 3 },
  medium: { questionSec: 13, hintsShown: 0, autoReveal: false, allowReveal: true,  bonusPts: 8,  streakAt: 3 },
  hard:   { questionSec:  8, hintsShown: 0, autoReveal: false, allowReveal: false, bonusPts: 12, streakAt: 3 },
}

// ── Helpers ────────────────────────────────────────────────────────────────────
const POINTS_BY_HINT = [10, 6, 3]   // pts for correct on hint 1, 2, 3
const ROUNDS         = 10

const GRADES = [
  { min: 90, label: 'CELEBRITY GURU',    color: '#ffd700' },
  { min: 70, label: 'SHOWBIZ SAVVY',     color: '#bf00ff' },
  { min: 50, label: 'CASUAL FAN',        color: '#00f5ff' },
  { min:  0, label: 'WHO ARE THESE PEOPLE?', color: '#888' },
]
const getGrade = (s) => GRADES.find(g => s >= g.min) || GRADES[GRADES.length - 1]

function buildRounds() {
  const shuffled = [...CELEBS].sort(() => Math.random() - 0.5).slice(0, ROUNDS)
  return shuffled.map(celeb => {
    // Prefer same-category distractors (more challenging) but fall back to any
    const sameCat = CELEBS.filter(c => c.name !== celeb.name && c.cat === celeb.cat)
    const diffCat = CELEBS.filter(c => c.name !== celeb.name && c.cat !== celeb.cat)
    const pool = sameCat.length >= 2
      ? [...sameCat.sort(() => Math.random() - 0.5).slice(0, 2),
         ...diffCat.sort(() => Math.random() - 0.5).slice(0, 1)]
      : [...CELEBS.filter(c => c.name !== celeb.name).sort(() => Math.random() - 0.5).slice(0, 3)]
    const options = [celeb.name, ...pool.map(o => o.name)].sort(() => Math.random() - 0.5)
    return { celeb, options }
  })
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function CelebGame({ difficulty = 'medium', onFinish }) {
  const { updateScore } = useUser()
  const cfg = DIFF[difficulty] ?? DIFF.medium

  const [rounds,       setRounds]       = useState([])
  const [qIdx,         setQIdx]         = useState(0)
  const [hintIdx,      setHintIdx]      = useState(0)   // 0-2 (which hint is latest)
  const [selected,     setSelected]     = useState(null)
  const [result,       setResult]       = useState(null) // 'correct' | 'wrong'
  const [total,        setTotal]        = useState(0)
  const [screen,       setScreen]       = useState('game')
  const [qTime,        setQTime]        = useState(cfg.questionSec)
  const [streak,       setStreak]       = useState(0)
  const [streakBanner, setStreakBanner] = useState(false)
  const [speedFlash,   setSpeedFlash]   = useState(false)

  const totalRef  = useRef(0)
  const streakRef = useRef(0)
  const qTimeRef  = useRef(cfg.questionSec)
  const busy      = useRef(false)
  const doneRef   = useRef(false)

  useEffect(() => { setRounds(buildRounds()) }, [])

  // ── Per-question countdown ───────────────────────────────────────────────────
  useEffect(() => {
    if (!rounds.length || screen !== 'game') return
    qTimeRef.current = cfg.questionSec
    setQTime(cfg.questionSec)
    doneRef.current = false

    const id = setInterval(() => {
      if (busy.current || doneRef.current) return
      qTimeRef.current -= 1
      setQTime(qTimeRef.current)

      // Easy mode: auto-reveal hints as time ticks
      if (cfg.autoReveal) {
        const half = Math.floor(cfg.questionSec / 2)
        const third = Math.floor(cfg.questionSec / 3)
        if (qTimeRef.current === half)   setHintIdx(h => Math.max(h, 1))
        if (qTimeRef.current === third)  setHintIdx(h => Math.max(h, 2))
      }

      if (qTimeRef.current <= 0) {
        // Timed out — advance as wrong
        clearInterval(id)
        busy.current = true
        doneRef.current = true
        streakRef.current = 0
        setStreak(0)
        setResult('timeout')
        setTimeout(() => advanceRef.current(totalRef.current, qIdx + 1), 1300)
      }
    }, 1000)

    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qIdx, rounds, screen])

  const advance = useCallback((newTotal, nextIdx) => {
    if (nextIdx >= ROUNDS) {
      updateScore?.('celeb', newTotal)
      if (onFinish) { onFinish(newTotal); return }
      setScreen('results')
    } else {
      setQIdx(nextIdx)
      setHintIdx(0)
      setSelected(null)
      setResult(null)
      busy.current = false
      doneRef.current = false
    }
  }, [updateScore])

  // keep advance in a ref so the interval closure can call it without stale closure
  const advanceRef = useRef(advance)
  useEffect(() => { advanceRef.current = advance }, [advance])

  const handleAnswer = useCallback((name) => {
    if (busy.current || result) return
    busy.current = true
    doneRef.current = true

    const q       = rounds[qIdx]
    const correct = name === q.celeb.name
    const basePts = correct ? POINTS_BY_HINT[hintIdx] : 0
    const isSpeed = qTimeRef.current > cfg.questionSec / 2   // answered in first half
    const speedPts = (correct && isSpeed) ? cfg.bonusPts : 0
    const pts = basePts + speedPts

    setSelected(name)
    setResult(correct ? 'correct' : 'wrong')

    if (correct) {
      totalRef.current += pts
      setTotal(totalRef.current)
      streakRef.current += 1
      setStreak(streakRef.current)
      if (streakRef.current >= cfg.streakAt) {
        setStreakBanner(true)
        setTimeout(() => setStreakBanner(false), 1800)
      }
      if (speedPts > 0) {
        setSpeedFlash(true)
        setTimeout(() => setSpeedFlash(false), 900)
      }
    } else {
      streakRef.current = 0
      setStreak(0)
    }

    setTimeout(() => advanceRef.current(totalRef.current, qIdx + 1), 1400)
  }, [rounds, qIdx, hintIdx, result, cfg])

  const revealHint = () => {
    if (hintIdx < 2 && !result) setHintIdx(h => h + 1)
  }

  // ── Results ─────────────────────────────────────────────────────────────────
  if (screen === 'results') {
    const grade = getGrade(total)
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4 pb-24">
        <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-sm rounded-3xl p-6 text-center"
          style={{ background: 'rgba(10,10,28,0.97)', border: '1px solid rgba(191,0,255,0.35)' }}>

          <div className="text-5xl mb-3">🌟</div>
          <p className="font-orbitron text-[10px] text-gray-500 tracking-widest mb-1">FINAL SCORE</p>
          <p className="font-orbitron text-5xl font-black mb-1" style={{ color: '#bf00ff' }}>{total}</p>
          <p className="font-orbitron text-xs font-bold mb-1" style={{ color: '#888' }}>OUT OF {ROUNDS * 10}</p>
          <p className="font-orbitron text-sm font-bold mb-6" style={{ color: grade.color }}>{grade.label}</p>

          <div className="grid grid-cols-3 gap-2 mb-6 text-center">
            {[
              { label: 'CORRECT',  value: rounds.filter((_, i) => i < ROUNDS).length, color: '#00ff88' },
              { label: 'MAX PTS',  value: `${ROUNDS * 10}`, color: '#ffd700' },
              { label: 'ACCURACY', value: `${Math.round((total / (ROUNDS * 10)) * 100)}%`, color: '#00f5ff' },
            ].map(s => (
              <div key={s.label} className="rounded-2xl py-3"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <p className="font-orbitron text-lg font-black" style={{ color: s.color }}>{s.value}</p>
                <p className="font-rajdhani text-[9px] text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="text-left mb-5 rounded-2xl p-3"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="font-orbitron text-[9px] text-gray-500 tracking-widest mb-2">SCORING</p>
            {[
              ['Correct on hint 1',     '10 pts'],
              ['Correct on hint 2',     '6 pts'],
              ['Correct on hint 3',     '3 pts'],
              [`⚡ Speed bonus`,        `+${cfg.bonusPts} pts`],
              ['Wrong / timed out',     '0 pts'],
            ].map(([label, pts]) => (
              <div key={label} className="flex justify-between mb-1">
                <p className="font-rajdhani text-xs text-gray-400">{label}</p>
                <p className="font-orbitron text-[10px]" style={{ color: '#bf00ff' }}>{pts}</p>
              </div>
            ))}
          </div>

          <button onClick={() => {
            totalRef.current = 0
            streakRef.current = 0
            qTimeRef.current = cfg.questionSec
            setTotal(0); setQIdx(0); setHintIdx(0)
            setSelected(null); setResult(null)
            setStreak(0); setStreakBanner(false)
            setRounds(buildRounds()); setScreen('game')
            busy.current = false
            doneRef.current = false
          }}
            className="w-full py-3 rounded-2xl font-orbitron text-xs tracking-widest"
            style={{ background: 'rgba(191,0,255,0.1)', border: '1px solid rgba(191,0,255,0.4)', color: '#bf00ff' }}>
            🔄 PLAY AGAIN
          </button>
        </motion.div>
      </div>
    )
  }

  if (!rounds.length) return null
  const q        = rounds[qIdx]
  const pct      = POINTS_BY_HINT[hintIdx]
  const timePct  = qTime / cfg.questionSec
  const timeColor = timePct > 0.5 ? '#00ff88' : timePct > 0.25 ? '#ffd700' : '#ff006e'
  const isUrgent  = qTime <= 3

  // ── Game screen ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-screen px-4 pb-24 pt-5 select-none">

      {/* Streak banner */}
      <AnimatePresence>
        {streakBanner && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0,   scale: 1    }}
            exit={{    opacity: 0, y: -12, scale: 0.9  }}
            className="fixed top-16 left-0 right-0 flex justify-center z-50 pointer-events-none">
            <div className="font-orbitron text-sm font-black px-5 py-2 rounded-full"
              style={{ background: 'rgba(255,80,0,0.9)', color: '#fff', boxShadow: '0 0 20px rgba(255,80,0,0.6)' }}>
              🔥 {streakRef.current} IN A ROW!
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Speed flash */}
      <AnimatePresence>
        {speedFlash && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1   }}
            exit={{    opacity: 0, scale: 1.1 }}
            className="fixed top-28 left-0 right-0 flex justify-center z-50 pointer-events-none">
            <div className="font-orbitron text-xs font-black px-4 py-1.5 rounded-full"
              style={{ background: 'rgba(0,245,255,0.85)', color: '#000', boxShadow: '0 0 16px rgba(0,245,255,0.5)' }}>
              ⚡ SPEED +{cfg.bonusPts}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="font-orbitron text-[10px] text-gray-500 tracking-widest">QUESTION</p>
          <p className="font-orbitron text-2xl font-black text-white">
            {qIdx + 1}<span className="text-base text-gray-600">/{ROUNDS}</span>
          </p>
        </div>
        <div className="text-center">
          <p className="font-orbitron text-[10px] text-gray-500 tracking-widest">SCORE</p>
          <p className="font-orbitron text-2xl font-black" style={{ color: '#bf00ff' }}>{total}</p>
        </div>
        <div className="text-right">
          <p className="font-orbitron text-[10px] text-gray-500 tracking-widest">WORTH</p>
          <p className="font-orbitron text-2xl font-black" style={{ color: pct === 10 ? '#ffd700' : pct === 6 ? '#00f5ff' : '#888' }}>
            {pct}
          </p>
        </div>
      </div>

      {/* Per-question timer bar */}
      <div className="mb-4 relative">
        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
          <motion.div
            animate={{ width: `${timePct * 100}%`, backgroundColor: timeColor }}
            transition={{ duration: 0.4, ease: 'linear' }}
            className="h-full rounded-full"
          />
        </div>
        <motion.span
          animate={{ color: isUrgent ? '#ff006e' : timeColor, scale: isUrgent ? [1,1.15,1] : 1 }}
          transition={{ repeat: isUrgent ? Infinity : 0, duration: 0.5 }}
          className="absolute right-0 -top-4 font-orbitron text-[10px]">
          {qTime}s
        </motion.span>
      </div>

      {/* Question card */}
      <AnimatePresence mode="wait">
        <motion.div key={qIdx}
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.25 }}
          className="rounded-3xl p-5 mb-4"
          style={{
            background: 'linear-gradient(135deg, rgba(191,0,255,0.1), rgba(0,0,0,0))',
            border: '1px solid rgba(191,0,255,0.3)',
          }}>

          {/* Category */}
          <span className="font-orbitron text-[9px] tracking-widest px-2.5 py-1 rounded-full"
            style={{ background: 'rgba(191,0,255,0.15)', color: '#bf00ff', border: '1px solid rgba(191,0,255,0.35)' }}>
            {q.celeb.cat}
          </span>

          {/* Hints */}
          <div className="mt-4 flex flex-col gap-3">
            {q.celeb.hints.slice(0, hintIdx + 1).map((hint, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                className="flex gap-3 items-start">
                <div className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center font-orbitron text-[9px] mt-0.5"
                  style={{
                    background: i === 0 ? 'rgba(255,215,0,0.2)' : i === 1 ? 'rgba(0,245,255,0.15)' : 'rgba(255,255,255,0.08)',
                    color: i === 0 ? '#ffd700' : i === 1 ? '#00f5ff' : '#888',
                    border: `1px solid ${i === 0 ? 'rgba(255,215,0,0.4)' : i === 1 ? 'rgba(0,245,255,0.3)' : 'rgba(255,255,255,0.1)'}`,
                  }}>
                  {i + 1}
                </div>
                <p className="font-rajdhani text-sm text-gray-200 leading-relaxed flex-1">{hint}</p>
              </motion.div>
            ))}
          </div>

          {/* Reveal hint button (hidden on hard difficulty) */}
          {!result && hintIdx < 2 && cfg.allowReveal && (
            <motion.button whileTap={{ scale: 0.95 }} onClick={revealHint}
              className="mt-4 w-full py-2 rounded-xl font-orbitron text-[10px] tracking-widest transition-all"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#666' }}>
              REVEAL HINT {hintIdx + 2} &nbsp;
              <span style={{ color: '#444' }}>(-{POINTS_BY_HINT[hintIdx] - POINTS_BY_HINT[hintIdx + 1]} pts)</span>
            </motion.button>
          )}

          {/* Timeout feedback */}
          {result === 'timeout' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="mt-3 text-center font-orbitron text-xs"
              style={{ color: '#ff006e' }}>
              ⏱ TIME UP — {q.celeb.name}
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* WHO IS IT? label */}
      <p className="font-orbitron text-[10px] text-gray-500 tracking-widest text-center mb-3">WHO IS IT?</p>

      {/* Answer options */}
      <div className="grid grid-cols-1 gap-2.5">
        {q.options.map((name) => {
          const isSelected = selected === name
          const isCorrect  = name === q.celeb.name
          let borderColor  = 'rgba(255,255,255,0.1)'
          let bgColor      = 'rgba(255,255,255,0.04)'
          let textColor    = '#ccc'

          if (result) {
            if (isCorrect) { borderColor = '#00ff88'; bgColor = 'rgba(0,255,136,0.12)'; textColor = '#00ff88' }
            else if (isSelected) { borderColor = '#ff006e'; bgColor = 'rgba(255,0,110,0.1)'; textColor = '#ff006e' }
            else { textColor = '#333' }
          }

          return (
            <motion.button key={name}
              whileTap={!result ? { scale: 0.98 } : {}}
              onClick={() => handleAnswer(name)}
              className="w-full px-4 py-3.5 rounded-2xl text-left font-rajdhani text-sm font-bold transition-all"
              style={{ background: bgColor, border: `1px solid ${borderColor}`, color: textColor }}>
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-xs"
                  style={{
                    background: result && isCorrect ? 'rgba(0,255,136,0.2)' : result && isSelected ? 'rgba(255,0,110,0.2)' : 'rgba(255,255,255,0.06)',
                    border: `1px solid ${result && isCorrect ? '#00ff88' : result && isSelected ? '#ff006e' : 'rgba(255,255,255,0.12)'}`,
                  }}>
                  {result && isCorrect ? '✓' : result && isSelected ? '✗' : ''}
                </div>
                <span>{name}</span>
              </div>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
