# DRAFT option - library cards

Detection via OCR (easyocr) over `images/library-*/`, refined with manual overrides in `data/draft_overrides.json`. Total 261 cards - **79 with DRAFT: clause**, 182 without.

> Method: regex `\bDRAFT\s*[:;]` on the extracted text. Accuracy ~95-98% - some cards with low image quality can yield false negatives.


## With DRAFT clause


### Common (44)

- **Aid From Bats** - _DRAFT: Do not replace until after combat. Maneuver._
- **Anonymous Freight** - _DRAFT: As above; but ignore the requirements of the equipment._
- **Apportation** - _DRAFT: [aus] Strike: dodge._
- **Armor of Vitality** - _DRAFT: [pro] Prevent 3 non-aggravated damage._
- **Awe** - _DRAFT: [pot] This vampire gets +X votes._
- **Bribes** - _DRAFT: [pre] As above and this vampire gets +1 vote._
- **Burst of Sunlight** - _DRAFT: [aus] Strike: combat ends._
- **Carrion Crows** - _DRAFT: [pre] As [ani] above; but only for this round._
- **Claws of the Dead** - _DRAFT: [ani] Maneuver._
- **Consanguineous Boon** - _DRAFT: As above, but choose two clans._
- **Cryptic Mission** - _DRAFT: [pot] D Inflict 1 damage on a minion and enter combat with them._
- **Earth Meld** - _DRAFT: [tha] Strike: dodge, with 1 optional press, only usable to continue the combat._
- **Enhanced Senses** - _DRAFT: [ani] +1 intercept._
- **Fleetness** - _DRAFT: [for] As [cel] above._
- **Flurry of Action** - _DRAFT: +1 stealth action. Discard Up to three cards._
- **Forced Vigilance** - _DRAFT: Reduce a bleed against you by 2._
- **Form of Mist** - _DRAFT: [cel] Strike: dodge._
- **Form of the Bat** - _DRAFT: [ani] This vampire gains 1 maneuver during the combat this action._
- **Hidden Strength** - _DRAFT: [THA] X is 0. As [FOR] above._
- **Immortal Grapple** - _DRAFT: [obf] Press._
- **Iron Glare** - _DRAFT: [cel][pre] As [pot][pre] above._
- **Leverage** - _DRAFT: [dom] +1 stealth._
- **Lost in Crowds** - _DRAFT: [pro] +1 stealth._
- **Meat Cleaver** - _DRAFT: [brujah] Strike: strength+1 damage; with optional maneuver each combat; only usable to get to close range._
- **Mind Numb** - _DRAFT: [ani] Enter combat with vampire._
- **Mirror Walk** - _DRAFT: [obf] As [tha] above._
- **Psyche!** - _DRAFT: [obf] Press._
- **Public Trust** - _DRAFT: [obf] +1 stealth action. D Bleed._
- **Pursuit** - _DRAFT: [pot] Maneuver._
- **Quickness** - _DRAFT: [ani] Strike: dodge, with additional strike._
- **Rapid Change** - _DRAFT: [obf] [mod] +1 stealth._
- **Restoration** - _DRAFT: [dom] As [for] above._
- **Roundhouse** - _DRAFT: [ani] As [pot] above._
- **Scorn of Adonis** - _DRAFT: [toreador] As above, and gain pool if the referendum passes._
- **Scouting Mission** - _DRAFT: [aus] As [dom] above._
- **Seduction** - _DRAFT: [pre] As [dom] above._
- **Side Strike** - _DRAFT: [aus] Strike: dodge._
- **Slam** - _DRAFT: [tha] As [pot] above._
- **Swallowed by the Night** - _DRAFT: [combat] Do not replace until after combat. Maneuver._
- **Telepathic Misdirection** - _DRAFT: [for] Reduce bleed against you by 3._
- **Theft of Vitae** - _DRAFT: [pro] Strike: steal 1 blood or life._
- **Thing** - _DRAFT: Draw 1 card from your crypt._
- **Voracious Vermin** - _DRAFT: [pre] Strike: dodge._
- **Wolf Claws** - _DRAFT: [ani] Press._


### Uncommon (16)

- **Arms Dealer** - _DRAFT: [brujah] As above, but the Arms Dealer can also search your ash heap._
- **Burning Wrath** - _DRAFT: [ani] As [pot] above._
- **Catatonic Fear** - _DRAFT: [obf] Strike: combat ends._
- **Command of the Beast** - _DRAFT: [pre] +1 bleed (limited)._
- **Cryptic Rider** - _DRAFT: The next referendum vampire you control calls before the end ofyour next turn passes automatically._
- **Force of Will** - _DRAFT: [aus] +1 stealth action: This vampire unlocks._
- **Forgotten Labyrinth** - _DRAFT: +1 stealth._
- **Freak Drive** - _DRAFT: [pro] As [for] above._
- **Guard Dogs** - _DRAFT: This vampire wakes._
- **Obedience** - _DRAFT: As [dom] above; but do not replace until your unlock phase._
- **Pulse of the Canaille** - _DRAFT: [PRE] As [AUS] above._
- **Resist Earth's Grasp** - _DRAFT: [aus] Maneuver._
- **Spying Mission** - _DRAFT: [pro] +1 stealth._
- **Tier of Souls** - _DRAFT: [tha] As [ani] above._
- **Walk of Flame** - _DRAFT: [cel] Strike: 2R damage._
- **Weather Control** - _DRAFT: [pro] As [tha] above._


### Rare (19)

- **Body Flare** - _DRAFT: Only usable in combat with an ally or a younger vampire. Strike: 2 aggravated damage._
- **Day Operation** - _DRAFT: [tha] +1 stealth._
- **Decapitate** - _DRAFT: [ani] As [pot] above._
- **Dog Pack** - _DRAFT: [gangrel] As above, and they cannot strike: dodge._
- **Far Mastery** - _DRAFT: Search your library and/or ash heap for an ally or retainer card, reveal it and move it to your hand._
- **Gather** - _DRAFT: [gangrel] As above, but you can choose Gangrel the same age or older._
- **Grooming the Protégé** - _DRAFT: As above, but the vampire can be of another clan._
- **Hide the Mind** - _DRAFT: [cel] [combat] Cancel a combat card requiring Presence [pre] as it is played._
- **Lightning Reflexes** - _DRAFT: [aus] Strike: combat ends._
- **Magic of the Smith** - _DRAFT: [tha] As [tha] above; but you can also search your ash heap._
- **Masochism** - _DRAFT: [aus] As [for] above._
- **Mesmerize** - _DRAFT: [pre] Lock a minion._
- **My Enemy's Enemy** - _DRAFT: Requires a ready vampire. As [AUS] above but not usable if an older vampire is acting._
- **Papillon** - _DRAFT: As above but requires a ready titled vampire._
- **Perfect Clarity** - _DRAFT: [aus] As [tha] above._
- **Permanent Vacation** - _DRAFT: As above, but choose vampire with capacity 3 or less to remove from the game._
- **Petra Resonance** - _DRAFT: As above._
- **Protected Resources** - _DRAFT: As above, but don't burn this card unless your minion bleeds for 2 or more._
- **Summoning, The** - _DRAFT: [PRE] As [PRE] above; but ignore the requirements of the ally._


## Without DRAFT clause


### Common (58)

- .44 Magnum
- Anarch Free Press, The
- Anarch Manifesto, An
- Anarchist Uprising
- Ancilla Empowerment
- Blood Doll
- Blood Fury
- Bonding
- Bum's Rush
- Cats' Guidance
- Cloak the Gathering
- Concealed Weapon
- Conditioning
- Cooler
- Creeping Sabotage
- Crocodile's Tongue
- Deep Ecology
- Deep Song
- Diversion
- Dodge
- Dust Up
- Elder Impersonation
- Entrancement
- Faceless Night
- Fake Out
- Flak Jacket
- Force of Personality
- Fourth Tradition: The Accounting
- Govern the Unaligned
- Harass
- Hawg
- Hunger of Marduk
- Kine Resources Contested
- Leather Jacket
- Life in the City
- Line Brawl
- Majesty
- Minion Tap
- Misdirection
- Night Moves
- On the Qui Vive
- Parity Shift
- Party out of Bounds
- Platinum Protocol, The
- Precognition
- Raven Spy
- Reckless Agitation
- Saturday-Night Special
- Scalpel Tongue
- Skin of Rock
- Special Report
- Spirit's Touch
- Sport Bike
- Torn Signpost
- Vessel
- Villein
- Wake with Evening's Freshness
- Warrens, The


### Uncommon (63)

- Abactor
- Academic Hunting Ground
- Amaranth
- Anarch Revolt
- Anima Gathering
- Archon Investigation
- Arson
- Assault Rifle
- Asylum Hunting Ground
- Aura Reading
- Bait and Switch
- Banishment
- Blood Tears of Kephran
- Brujah Debate
- Change of Target
- Chantry
- Charming Lobby
- Childling Muse
- Deer Rifle
- Delaying Tactics
- Dummy Corporation
- Elder Library
- Fame
- Flamethrower
- Flesh of Marble
- Gangrel Revel
- Guardian Angel
- Haven Uncovered
- Helicopter
- Heroic Might
- Infernal Pursuit
- Information Highway
- IR Goggles
- Kiss of Ra, The
- KRCG News Radio
- Major Boon
- Market Square
- Metro Underground
- Perfectionist
- Political Stranglehold
- Preternatural Strength
- Procurer
- Rack, The
- Rat's Warning
- Scrounging
- Second Tradition: Domain
- Slum Hunting Ground
- Society Hunting Ground
- Sudden Reversal
- Temple Hunting Ground
- Toreador Grand Ball
- Tribute to the Master
- Underbridge Stray
- Underworld Hunting Ground
- Uptown Hunting Ground
- Voter Captivation
- Vulnerability
- Warzone Hunting Ground
- Waters of Duat
- Weighted Walking Stick
- Wooden Stake
- Zip Gun
- Zoo Hunting Ground


### Rare (61)

- 47th Street Royals
- Aaron's Feeding Razor
- Alamut
- Anarch Railroad
- Anarch Troublemaker
- Ancient Influence
- Aranthebes, the Immortal
- Arcane Library
- Art Museum
- Blithe Acceptance
- Bowl of Convergence
- Carlton Van Wyk
- Club Illusion
- Crimson Sentinel, The
- Daring The Dawn
- Disarm
- Distraction
- Dominate Kine
- Dreams of the Sphinx
- Dual Form
- Embrace, The
- Ferraille
- Fragment of the Book of Nod
- Giant's Blood
- Heart of Nizchetus
- Heart of the City
- Island of Yiaros
- Ivory Bow
- J. S. Simmons, Esq.
- Jake Washington
- Judgment: Camarilla Segregation
- Khobar Towers, Al-Khubar
- Malkavian Prank
- Melange
- Monocle of Clarity
- Mr. Winthrop
- Murder of Crows
- New Carthage
- Nosferatu Bestial
- Open War
- Pentex(TM) Subversion
- Political Ally
- Ponticulus
- Powerbase: Montreal
- Psychic Veil
- Pulled Fangs
- Reinforcements
- Reins of Power
- Resplendent Protector
- Robert Carter
- Seal of Veddartha
- Sengir Dagger
- Smiling Jack, The Anarch
- Sunset Strip, Hollywood
- Talbot's Chainsaw
- Tasha Morgan
- Terror Frenzy
- Vox Domini
- Warsaw Station
- WMRH Talk Radio
- Young Bloods
