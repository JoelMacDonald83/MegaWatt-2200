
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { PhoenixEditor } from './screens/PhoenixEditor';
import { MegaWattGame } from './screens/MegaWattGame';
import type { GameData, ChoiceOutcome, PhoenixProject, SimSaveSlot } from './types';
import { debugService } from './services/debugService';
import { HistoryService } from './services/historyService';
import { ArrowUturnLeftIcon } from './components/icons/ArrowUturnLeftIcon';
import { ArrowUturnRightIcon } from './components/icons/ArrowUturnRightIcon';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { Cog6ToothIcon } from './components/icons/Cog6ToothIcon';
import { SettingsModal } from './components/SettingsModal';
import { GlobalStyles } from './components/GlobalStyles';
import { SimulationScreen } from './screens/SimulationScreen';
import { SimulationHeader } from './components/SimulationHeader';
import { Toast } from './components/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AutosavePrompt } from './components/AutosavePrompt';

// --- IDs for consistent referencing ---

// TEMPLATES & COMPONENTS
const TEMPLATE_CHARACTER_ID = 'template_char_1';
const TEMPLATE_POWER_SOURCE_ID = 'template_power_1';
const TEMPLATE_FACILITY_ID = 'template_facility_1';
const TEMPLATE_DRONE_ID = 'template_drone_1';
const TEMPLATE_COLONY_STATS_ID = 'template_colony_stats_1';
const TEMPLATE_LOCATION_ID = 'template_location_1';
const TEMPLATE_RESOURCE_ID = 'template_resource_1';
const TEMPLATE_DATA_LOG_ID = 'template_data_log_1';
const TEMPLATE_CREW_QUARTERS_ID = 'template_facility_quarters';
const TEMPLATE_SECURITY_TEAM_ID = 'template_char_security';
const TEMPLATE_MEDIC_ID = 'template_char_medic';


const COMPONENT_SKILL_HACKING_ID = 'comp_skill_hacking_1';
const COMPONENT_SKILL_ACCOUNTING_ID = 'comp_skill_accounting_1';
const COMPONENT_SKILL_ENGINEERING_ID = 'comp_skill_engineering_1';
const COMPONENT_WEAPONS_TRAINING_ID = 'comp_skill_weapons';
const COMPONENT_MEDICAL_TRAINING_ID = 'comp_skill_medical';


// ATTRIBUTES
const ATTR_BACKSTORY_ID = 'attr_backstory_1';
const ATTR_ROLE_ID = 'attr_role_1';
const ATTR_DESCRIPTION_ID = 'attr_desc_1';
const ATTR_OPERATOR_ID = 'attr_operator_1';
const ATTR_STATUS_ID = 'attr_status_1';
const ATTR_POWER_SOURCE_ID = 'attr_power_source_1';
const ATTR_SKILL_LEVEL_ID = 'attr_skill_level_1';
const ATTR_SKILL_SPEC_ID = 'attr_skill_spec_1';
const ATTR_LOG_CONTENT_ID = 'attr_log_content_1';
const ATTR_ANALYSIS_ID = 'attr_analysis_1';
const ATTR_INVESTIGATOR_ID = 'attr_investigator_1';
const ATTR_OP_MODE_ID = 'attr_op_mode_1';
const ATTR_CAPACITY_ID = 'attr_capacity';
const ATTR_MORALE_EFFECT_ID = 'attr_morale_effect';
const ATTR_WEAPON_PROFICIENCY_ID = 'attr_weapon_prof';
const ATTR_FIELD_EXPERIENCE_ID = 'attr_field_exp';


// CHOICES
const CHOICE_INTRO_1 = 'choice_intro_1';
const CHOICE_INTRO_2 = 'choice_intro_2';
const CHOICE_FIRST_PRIORITY_ID = 'choice_1';
const CHOICE_ASSIGN_OPERATOR_ID = 'choice_2';
const CHOICE_GAMMA_ANOMALY_START = 'choice_gamma_1';
const CHOICE_GAMMA_ASSIGN_INVESTIGATOR = 'choice_gamma_2';
const CHOICE_GAMMA_TUNNEL_ENTRY = 'choice_gamma_3';
const CHOICE_GAMMA_CRYSTAL_FOUND = 'choice_gamma_4';
const CHOICE_COLONY_STATUS_REPORT = 'choice_colony_1';
const CHOICE_QUARTERS_EXPANSION = 'choice_colony_2';
const CHOICE_SECURITY_PATROL = 'choice_colony_3';


// ENTITIES
const ENTITY_GEOTHERMAL_VENT_ID = 'ps_1';
const ENTITY_JAX_ID = 'char_1';
const ENTITY_RILEY_ID = 'char_3';
const ENTITY_SECTOR_GAMMA_TUNNELS_ID = 'loc_1';
const ENTITY_KAELEN_ID = 'char_4';
const ENTITY_DR_ELARA_ID = 'char_5';
const ENTITY_SGT_REX_ID = 'char_6';
const ENTITY_CREW_QUARTERS_ALPHA_ID = 'facility_1';

const SHOWCASE_IMAGE_INITIAL_1 = 'img_initial_1';


const initialGameData: GameData = {
  id: 'game_mw2200',
  gameTitle: 'MegaWatt 2200',
  colonyName: 'Aethelburg Node',
  startChoiceId: CHOICE_INTRO_1,
  cardCoverImageId: SHOWCASE_IMAGE_INITIAL_1,
  menuSettings: {
    description: 'A sputtering candle in the dark. As its new Administrator, you must make the hard choices that will determine whether that candle is snuffed out, or burns bright enough to ignite a new dawn.',
    tags: ['Sci-Fi', 'Narrative Driven', 'Colony Sim'],
    showcaseImages: [
        {
            id: SHOWCASE_IMAGE_INITIAL_1,
            prompt: 'A lone figure stands on a high balcony overlooking a futuristic, cyberpunk colony dome at night. The mood is contemplative and serious.',
            // FIX: The 'base64' property does not exist on type 'ShowcaseImage'. Changed to 'src'.
            src: ''
        }
    ],
    news: [
      {
        id: 'news_1',
        date: '2200-10-26',
        title: 'Power Fluctuations Detected in Sector Gamma',
        author: 'Engineering Department',
        content: '**Attention all personnel:**\n\nWe are tracking intermittent power surges originating from the geothermal plant. Non-essential systems may be temporarily rerouted.\n\nAn investigation is underway. Please conserve energy until further notice.',
        imagePrompt: 'A futuristic power grid schematic with a glowing red warning symbol over a specific sector. Dark, high-tech interface.',
        // FIX: The 'imageBase64' property does not exist on type 'NewsItem'. Changed to 'src'.
        src: '',
        tags: ['System Alert', 'Engineering'],
        style: 'urgent',
        status: 'published',
        layout: 'image_top',
      }
    ],
    credits: 'Created with the Phoenix Editor for MegaWatt 2200.',
  },
  choiceChunks: [
    {
      id: `chunk_intro_${Date.now()}`,
      name: 'Introduction',
      description: 'The opening scenes and initial player choices.',
      choiceIds: [CHOICE_INTRO_1, CHOICE_INTRO_2, CHOICE_FIRST_PRIORITY_ID, CHOICE_ASSIGN_OPERATOR_ID],
    },
    {
        id: `chunk_gamma_${Date.now()}`,
        name: 'Sector Gamma Anomaly',
        description: 'A short quest to investigate the power fluctuations.',
        choiceIds: [CHOICE_GAMMA_ANOMALY_START, CHOICE_GAMMA_ASSIGN_INVESTIGATOR, CHOICE_GAMMA_TUNNEL_ENTRY, CHOICE_GAMMA_CRYSTAL_FOUND],
    },
    {
        id: `chunk_colony_${Date.now()}`,
        name: 'Colony Management',
        description: 'Choices related to the day-to-day operation and expansion of the colony.',
        choiceIds: [CHOICE_COLONY_STATUS_REPORT, CHOICE_QUARTERS_EXPANSION, CHOICE_SECURITY_PATROL],
    },
  ],
  allChoices: [
    // --- INTRO CHUNK ---
    {
      id: CHOICE_INTRO_1,
      name: 'Intro Scene 1',
      description: 'In the smog-choked canyons of a dying Earth, humanity fled to the stars. We built colonies, metal islands in the vast, silent ocean of space. This is the story of one such outpost.',
      imagePrompt: 'A vast, detailed cyberpunk city under a polluted, orange sky. Flying vehicles weave between towering skyscrapers adorned with neon signs. Cinematic, wide-angle shot.',
      choiceType: 'static',
      nextChoiceId: CHOICE_INTRO_2,
      styles: { textPosition: 'middle', textAlign: 'center', fontFamily: 'serif', fontSize: 'large', cardTransition: 'dissolve', cardTransitionDuration: 1.5, textAnimation: 'typewriter', textAnimationDuration: 4, textAnimationDelay: 1.6 }
    },
    {
      id: CHOICE_INTRO_2,
      name: 'Intro Scene 2',
      description: 'Aethelburg Node. A sputtering candle in the dark. As its new Administrator, you must make the hard choices that will determine whether that candle is snuffed out, or burns bright enough to ignite a new dawn.',
      imagePrompt: 'A lone figure stands on a high balcony overlooking a futuristic, cyberpunk colony dome at night. The mood is contemplative and serious.',
      choiceType: 'static',
      nextChoiceId: CHOICE_FIRST_PRIORITY_ID,
       styles: { textPosition: 'bottom', textAlign: 'center', overlayStrength: 'heavy', textWidth: 'wide', cardTransition: 'slide-left', textAnimation: 'rise-up', textAnimationDelay: 0.8 }
    },
    {
      id: CHOICE_FIRST_PRIORITY_ID,
      name: 'First Priority Directive',
      description: 'Your first directive has arrived from the consortium. Resources are scarce, and you must decide where to focus the colony\'s initial efforts.',
      imagePrompt: 'A holographic interface displaying resource allocation charts and colony schematics. A hand is reaching out to touch one of the options. Tech noir, glowing interface.',
      prompt: "What is our first priority?",
      choiceType: 'static',
      staticOptions: [
        { id: 'opt_1', text: "Secure the Food Supply", outcomes: [{ type: 'create_entity', templateId: TEMPLATE_FACILITY_ID, name: "Hydroponics Bay Alpha", attributeValues: { [ATTR_STATUS_ID]: "Online and operational. Initial yields are stable." }}]},
        { id: 'opt_2', text: "Expand Reconnaissance", outcomes: [{ type: 'create_entity', templateId: TEMPLATE_DRONE_ID, name: "Scout Drone Relay", attributeValues: { [ATTR_STATUS_ID]: "Active. Now monitoring local sectors for resources and anomalies." }}]}
      ]
    },
    {
      id: CHOICE_ASSIGN_OPERATOR_ID,
      name: 'Assign Geothermal Plant Operator',
      description: 'The Geo-Thermal Vent needs a dedicated operator.',
      imagePrompt: 'A massive, industrial geothermal power plant inside a rocky cavern, steam billowing from pipes.',
      prompt: 'Who will you assign?',
      choiceType: 'dynamic_from_template',
      dynamicConfig: {
        sourceTemplateIds: [TEMPLATE_CHARACTER_ID],
        optionTemplate: { text: '{entity.name}' },
        outcomeTemplates: [{ type: 'update_entity', targetEntityId: ENTITY_GEOTHERMAL_VENT_ID, attributeId: ATTR_OPERATOR_ID, value: '<chosen_entity_id>'}],
        nextChoiceId: null,
        filterConditions: [{ type: 'attribute', targetEntityId: '', attributeId: ATTR_ROLE_ID, operator: '==', value: null }]
      },
      styles: {
        choiceLayout: 'grid'
      }
    },
    // --- SECTOR GAMMA CHUNK ---
    {
      id: CHOICE_GAMMA_ANOMALY_START,
      name: 'Investigate Power Fluctuations',
      description: 'The persistent power fluctuations from Sector Gamma demand attention. A formal investigation is required to determine the source.',
      imagePrompt: 'A cluttered workbench in a futuristic engineering bay. Schematics are displayed on a transparent screen, with diagnostic graphs showing erratic energy spikes.',
      choiceType: 'static',
      nextChoiceId: CHOICE_GAMMA_ASSIGN_INVESTIGATOR,
    },
    {
        id: CHOICE_GAMMA_ASSIGN_INVESTIGATOR,
        name: 'Assign Investigator',
        description: 'A skilled operative is needed to venture into the maintenance tunnels of Sector Gamma and find the source of the anomaly.',
        imagePrompt: 'A heavily armored door to a dark industrial tunnel, with warning signs in a futuristic font. The air is hazy with steam.',
        prompt: 'Assign an investigator:',
        choiceType: 'dynamic_from_template',
        dynamicConfig: {
            sourceTemplateIds: [TEMPLATE_CHARACTER_ID],
            requiredComponentIds: [COMPONENT_SKILL_ENGINEERING_ID], // Only show characters with Engineering skill
            optionTemplate: { text: 'Assign {entity.name}' },
            outcomeTemplates: [
                { type: 'create_entity', templateId: TEMPLATE_DATA_LOG_ID, name: "Sector Gamma Investigation Log", attributeValues: { [ATTR_INVESTIGATOR_ID]: '<chosen_entity_id>', [ATTR_LOG_CONTENT_ID]: 'Investigation initiated.' } }
            ],
            nextChoiceId: CHOICE_GAMMA_TUNNEL_ENTRY,
        },
        styles: {
            choiceLayout: 'grid'
        }
    },
    {
        id: CHOICE_GAMMA_TUNNEL_ENTRY,
        name: 'Enter the Tunnels',
        description: 'The investigator descends into the humming darkness of the Sector Gamma maintenance tunnels. The air is thick with the smell of ozone and hot metal.',
        imagePrompt: 'First-person view looking down a long, dark, cylindrical maintenance tunnel with glowing pipes running along the walls. Very atmospheric and slightly claustrophobic.',
        choiceType: 'static',
        nextChoiceId: CHOICE_GAMMA_CRYSTAL_FOUND,
    },
    {
        id: CHOICE_GAMMA_CRYSTAL_FOUND,
        name: 'The Source',
        description: 'At the heart of a junction box, a strange, crystalline structure pulses with an eerie light, resonating with the station\'s power conduits. This is the source of the anomaly.',
        imagePrompt: 'A close-up of a glowing, pulsating blue crystal embedded in a complex array of futuristic wires and machinery. The crystal is the only source of light.',
        prompt: 'What do you do?',
        choiceType: 'static',
        staticOptions: [
            { id: 'gamma_opt_1', text: "Carefully extract the crystal", outcomes: [{ type: 'create_entity', templateId: TEMPLATE_RESOURCE_ID, name: 'Anomalous Crystal', attributeValues: { [ATTR_ANALYSIS_ID]: 'Highly unstable, exhibits exotic energy properties.' } }] },
            { id: 'gamma_opt_2', text: "Smash it", outcomes: [] },
        ]
    },
    // --- COLONY MANAGEMENT CHUNK ---
    {
      id: CHOICE_COLONY_STATUS_REPORT,
      name: 'Colony Status Report',
      description: 'The morning reports flicker across your console. Life support is stable, power output is nominal, and the latest hydroponics yield is within projections. A quiet day, for once.',
      imagePrompt: 'A calm, futuristic command center with holographic displays showing green, stable readouts. The sun is rising through a large viewport, illuminating the room.',
      choiceType: 'static',
      nextChoiceId: null,
      styles: { textPosition: 'middle', textAlign: 'left', textWidth: 'medium' }
    },
    {
      id: CHOICE_QUARTERS_EXPANSION,
      name: 'Expand Crew Quarters',
      description: 'The current crew quarters are at maximum capacity. Expanding them would improve morale but will divert resources from other critical projects.',
      imagePrompt: 'Construction drones welding beams inside a large, unfinished habitat module. Sparks fly in the zero-G environment.',
      prompt: 'Approve the expansion of Crew Quarters Alpha?',
      choiceType: 'static',
      staticOptions: [
        {
            id: 'cq_opt_1',
            text: "Approve. Our people need space.",
            outcomes: [{
                type: 'update_entity',
                targetEntityId: ENTITY_CREW_QUARTERS_ALPHA_ID,
                attributeId: ATTR_CAPACITY_ID,
                value: 75
            }, {
                type: 'update_entity',
                targetEntityId: ENTITY_CREW_QUARTERS_ALPHA_ID,
                attributeId: ATTR_MORALE_EFFECT_ID,
                value: 'Positive'
            }]
        },
        { id: 'cq_opt_2', text: "Deny. Resources are too tight.", outcomes: [] }
      ]
    },
    {
        id: CHOICE_SECURITY_PATROL,
        name: 'Assign Security Patrol',
        description: 'There have been reports of strange noises from the outer maintenance shafts. A security patrol should investigate.',
        imagePrompt: 'A dark, grimy maintenance corridor, with a single flickering light overhead. Steam vents from pipes along the walls.',
        prompt: 'Who will lead the patrol?',
        choiceType: 'dynamic_from_template',
        dynamicConfig: {
            sourceTemplateIds: [TEMPLATE_SECURITY_TEAM_ID],
            optionTemplate: { text: 'Dispatch {entity.name}' },
            outcomeTemplates: [{
                type: 'create_entity',
                templateId: TEMPLATE_DATA_LOG_ID,
                name: 'Patrol Log: Outer Shafts',
                attributeValues: {
                    [ATTR_INVESTIGATOR_ID]: '<chosen_entity_id>',
                    [ATTR_LOG_CONTENT_ID]: 'Patrol dispatched to investigate anomalous sounds in the outer maintenance shafts.'
                }
            }],
            nextChoiceId: null,
        }
    }
  ],
  templates: [
    { id: TEMPLATE_CHARACTER_ID, name: 'Character', description: 'A person or operative in the colony.', tags: ['personnel'], isComponent: false, attributes: [ { id: ATTR_BACKSTORY_ID, name: 'Backstory', type: 'textarea' }, { id: ATTR_ROLE_ID, name: 'Role', type: 'string' }], includedComponentIds: [COMPONENT_SKILL_HACKING_ID, COMPONENT_SKILL_ENGINEERING_ID] },
    { id: TEMPLATE_POWER_SOURCE_ID, name: 'Power Source', description: 'A facility that generates power.', tags: ['utility', 'location'], isComponent: false, attributes: [ { id: ATTR_DESCRIPTION_ID, name: 'Description', type: 'textarea' }, { id: ATTR_OPERATOR_ID, name: 'Operator', type: 'entity_reference', referencedTemplateId: TEMPLATE_CHARACTER_ID }, { id: ATTR_OP_MODE_ID, name: 'Operational Mode', type: 'string', isPlayerEditable: true, playerEditOptions: ['Normal Output', 'Overdrive', 'Emergency Shutdown'] }]},
    { id: TEMPLATE_FACILITY_ID, name: 'Facility', description: 'A structural installation.', tags: ['location'], isComponent: false, attributes: [ { id: ATTR_STATUS_ID, name: 'Status Report', type: 'textarea' }]},
    { id: TEMPLATE_DRONE_ID, name: 'Drone System', description: 'An automated system.', tags: ['utility'], isComponent: false, attributes: [ { id: ATTR_STATUS_ID, name: 'Status Report', type: 'textarea' }]},
    { id: TEMPLATE_LOCATION_ID, name: 'Location', description: 'An explorable area.', tags: ['location'], isComponent: false, attributes: [ { id: ATTR_DESCRIPTION_ID, name: 'Description', type: 'textarea' }]},
    { id: TEMPLATE_RESOURCE_ID, name: 'Resource', description: 'A collectible or analyzable resource.', tags: ['item'], isComponent: false, attributes: [ { id: ATTR_ANALYSIS_ID, name: 'Analysis', type: 'textarea' }]},
    { id: TEMPLATE_DATA_LOG_ID, name: 'Data Log', description: 'A log or journal entry.', tags: ['lore'], isComponent: false, attributes: [ { id: ATTR_INVESTIGATOR_ID, name: 'Author', type: 'entity_reference', referencedTemplateId: TEMPLATE_CHARACTER_ID }, { id: ATTR_LOG_CONTENT_ID, name: 'Content', type: 'textarea' }]},
    { id: TEMPLATE_COLONY_STATS_ID, name: 'Colony Stats', description: 'High-level status for the colony.', tags: ['system'], isComponent: false, attributes: [ { id: ATTR_POWER_SOURCE_ID, name: 'Primary Power Source', type: 'entity_reference', referencedTemplateId: TEMPLATE_POWER_SOURCE_ID }]},
    { id: TEMPLATE_CREW_QUARTERS_ID, name: 'Crew Quarters', description: 'Living quarters for colony personnel.', tags: ['facility', 'personnel'], isComponent: false, parentId: TEMPLATE_FACILITY_ID, attributes: [ { id: ATTR_CAPACITY_ID, name: 'Capacity', type: 'number' }, { id: ATTR_MORALE_EFFECT_ID, name: 'Morale Effect', type: 'string' } ] },
    { id: TEMPLATE_SECURITY_TEAM_ID, name: 'Security Officer', description: 'Personnel trained for security and defense operations.', tags: ['personnel', 'security'], isComponent: false, parentId: TEMPLATE_CHARACTER_ID, includedComponentIds: [COMPONENT_WEAPONS_TRAINING_ID], attributes: [ { id: ATTR_FIELD_EXPERIENCE_ID, name: 'Field Experience', type: 'textarea' } ] },
    { id: TEMPLATE_MEDIC_ID, name: 'Medical Officer', description: 'Personnel trained for medical operations.', tags: ['personnel', 'medical'], isComponent: false, parentId: TEMPLATE_CHARACTER_ID, includedComponentIds: [COMPONENT_MEDICAL_TRAINING_ID], attributes: [] },
    // --- Components ---
    { id: COMPONENT_SKILL_HACKING_ID, name: 'Skill: Hacking', description: 'For characters who can bypass digital security.', tags: ['skill'], isComponent: true, attributes: [ { id: ATTR_SKILL_LEVEL_ID, name: 'Level', type: 'number' }]},
    { id: COMPONENT_SKILL_ACCOUNTING_ID, name: 'Skill: Accounting', description: 'For characters who can manage finances.', tags: ['skill'], isComponent: true, attributes: [ { id: ATTR_SKILL_LEVEL_ID, name: 'Level', type: 'number' }, { id: ATTR_SKILL_SPEC_ID, name: 'Specialization', type: 'string'}]},
    { id: COMPONENT_SKILL_ENGINEERING_ID, name: 'Skill: Engineering', description: 'For characters who can repair and analyze hardware.', tags: ['skill'], isComponent: true, attributes: [ { id: ATTR_SKILL_LEVEL_ID, name: 'Level', type: 'number' }]},
    { id: COMPONENT_WEAPONS_TRAINING_ID, name: 'Skill: Weapons Training', description: 'Proficiency with various firearms and combat tactics.', tags: ['skill', 'combat'], isComponent: true, attributes: [ { id: ATTR_WEAPON_PROFICIENCY_ID, name: 'Weapon Proficiency', type: 'string' } ] },
    { id: COMPONENT_MEDICAL_TRAINING_ID, name: 'Skill: Medical Training', description: 'Ability to perform first aid and medical procedures.', tags: ['skill', 'medical'], isComponent: true, attributes: [ { id: ATTR_SKILL_LEVEL_ID, name: 'Level', type: 'number' } ]}
  ],
  entities: [
    { id: ENTITY_JAX_ID, templateId: TEMPLATE_CHARACTER_ID, name: 'Jax "Glitch" Corrigan', attributeValues: { [ATTR_BACKSTORY_ID]: 'A former corporate netrunner who keeps the colony\'s systems from frying.', [ATTR_ROLE_ID]: 'Chief Systems Analyst', [`${COMPONENT_SKILL_HACKING_ID}_${ATTR_SKILL_LEVEL_ID}`]: 5, [`${COMPONENT_SKILL_ENGINEERING_ID}_${ATTR_SKILL_LEVEL_ID}`]: 2 }},
    { id: 'char_2', templateId: TEMPLATE_CHARACTER_ID, name: 'Dr. Aris Thorne', attributeValues: { [ATTR_BACKSTORY_ID]: 'A bio-engineer with a questionable past.', [ATTR_ROLE_ID]: null }},
    { id: ENTITY_RILEY_ID, templateId: TEMPLATE_CHARACTER_ID, name: 'Riley "Spark" Chen', attributeValues: { [ATTR_BACKSTORY_ID]: 'A gifted mechanic who can fix anything from a coffee maker to a fusion reactor with little more than a wrench and sheer willpower.', [ATTR_ROLE_ID]: 'Lead Technician', [`${COMPONENT_SKILL_ENGINEERING_ID}_${ATTR_SKILL_LEVEL_ID}`]: 4, [`${COMPONENT_SKILL_HACKING_ID}_${ATTR_SKILL_LEVEL_ID}`]: 1 } },
    { id: ENTITY_GEOTHERMAL_VENT_ID, templateId: TEMPLATE_POWER_SOURCE_ID, name: 'Geo-Thermal Vent Alpha', attributeValues: { [ATTR_DESCRIPTION_ID]: 'The primary geothermal power plant, tapping into the planet\'s unstable core.', [ATTR_OPERATOR_ID]: null, [ATTR_OP_MODE_ID]: 'Normal Output' }},
    { id: ENTITY_SECTOR_GAMMA_TUNNELS_ID, templateId: TEMPLATE_LOCATION_ID, name: 'Sector Gamma Tunnels', attributeValues: { [ATTR_DESCRIPTION_ID]: 'A maze of humming maintenance corridors, rarely travelled and poorly lit.'}},
    { id: ENTITY_KAELEN_ID, templateId: TEMPLATE_CHARACTER_ID, name: 'Kaelen "Cable" Vance', attributeValues: { [ATTR_BACKSTORY_ID]: 'A quiet but brilliant technician who prefers the company of machines to people. Responsible for maintaining the colony\'s intricate network of physical infrastructure.', [ATTR_ROLE_ID]: 'Infrastructure Specialist', [`${COMPONENT_SKILL_ENGINEERING_ID}_${ATTR_SKILL_LEVEL_ID}`]: 5, [`${COMPONENT_SKILL_HACKING_ID}_${ATTR_SKILL_LEVEL_ID}`]: 3 } },
    // FIX: Corrected a typo in the constant name from `COMPONENT_HACKING_ID` to `COMPONENT_SKILL_HACKING_ID`.
    { id: ENTITY_DR_ELARA_ID, templateId: TEMPLATE_MEDIC_ID, name: 'Dr. Elara Vance', attributeValues: { [ATTR_BACKSTORY_ID]: 'The colony\'s chief medical officer. Calm under pressure and deeply empathetic, but haunted by a medical disaster in her past.', [ATTR_ROLE_ID]: 'Chief Medical Officer', [`${COMPONENT_SKILL_HACKING_ID}_${ATTR_SKILL_LEVEL_ID}`]: 2, [`${COMPONENT_MEDICAL_TRAINING_ID}_${ATTR_SKILL_LEVEL_ID}`]: 5 } },
    { id: ENTITY_SGT_REX_ID, templateId: TEMPLATE_SECURITY_TEAM_ID, name: 'Sgt. Rex "Hammer" Ivanova', attributeValues: { [ATTR_BACKSTORY_ID]: 'A veteran of the Outer Rim conflicts. Gruff and cynical, but fiercely loyal to the colony and its people.', [ATTR_ROLE_ID]: 'Head of Security', [`${COMPONENT_WEAPONS_TRAINING_ID}_${ATTR_WEAPON_PROFICIENCY_ID}`]: 'Pulse Rifles', [ATTR_FIELD_EXPERIENCE_ID]: 'Served 5 tours with the Consortium Marines. Specializes in close-quarters combat and perimeter defense.' } },
    { id: ENTITY_CREW_QUARTERS_ALPHA_ID, templateId: TEMPLATE_CREW_QUARTERS_ID, name: 'Crew Quarters Alpha', attributeValues: { [ATTR_STATUS_ID]: 'Fully occupied. Reports of minor life support malfunctions.', [ATTR_CAPACITY_ID]: 50, [ATTR_MORALE_EFFECT_ID]: 'Neutral' } },
  ],
};

const initialProject: PhoenixProject = {
  launcherSettings: {
    companyName: "Aetherion Interactive",
    news: [
       {
        id: 'news_company_1',
        date: '2201-01-01',
        title: 'Welcome to the Aetherion Launcher!',
        author: 'The Aetherion Team',
        content: 'This is the central hub for all our upcoming titles. Stay tuned for more announcements!',
        status: 'published',
        style: 'lore',
        layout: 'image_top',
      }
    ],
    backgroundImagePrompt: 'A sleek, futuristic, dark sci-fi computer interface with glowing abstract geometric patterns. Minimalist and clean.',
    gameListLayout: 'grid',
    gameCardStyle: {
      imageAspectRatio: '16/9',
      hoverEffect: 'lift',
      imageDisplay: 'single',
      backgroundColor: '#1f293780',
      borderColor: '#4b5563',
      headerText: '{game.gameTitle}',
      headerStyle: { color: '#ffffff', fontSize: 'lg', textAlign: 'left' },
      bodyText: '{game.colonyName}',
      bodyStyle: { color: '#9ca3af', fontSize: 'sm', textAlign: 'left' },
      buttonColor: '#22d3ee',
      buttonTextColor: '#111827',
    },
    gameListStyle: {
        backgroundType: 'transparent',
        backgroundColor1: '#1f293780',
        backgroundColor2: '#11182740',
        padding: 0,
        borderRadius: 0,
    }
  },
  games: [initialGameData],
  layouts: [],
  componentLayouts: [],
};


const AppContent: React.FC = () => {
  const { settings } = useSettings();
  const [viewMode, setViewMode] = useState<'editor' | 'launcher' | 'simulation'>('editor');
  
  const editorHistory = useMemo(() => new HistoryService<PhoenixProject>(initialProject), []);
  const [projectData, setProjectData] = useState<PhoenixProject>(() => editorHistory.current()!);
  const [canUndoEditor, setCanUndoEditor] = useState(editorHistory.canUndo());
  const [canRedoEditor, setCanRedoEditor] = useState(editorHistory.canRedo());
  
  // State for simulation
  const [simulationProject, setSimulationProject] = useState<GameData | null>(null);
  const simHistory = useMemo(() => simulationProject ? new HistoryService<GameData>(simulationProject) : null, [simulationProject]);
  const [canUndoSim, setCanUndoSim] = useState(false);
  const [canRedoSim, setCanRedoSim] = useState(false);

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' as 'success' | 'error' });

  // --- AUTOSAVE STATE ---
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [autosaveToLoad, setAutosaveToLoad] = useState<PhoenixProject | null>(null);
  const autosaveTimeoutRef = useRef<number | null>(null);
  const lastFileSaveTimestampRef = useRef<number>(0);
  const isProgrammaticChange = useRef(true); // Start as true to prevent initial save


  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    debugService.log(`Toast: ${type.toUpperCase()}`, { message });
    setToast({ show: true, message, type });
    setTimeout(() => setToast(p => p.show ? { ...p, show: false } : p), 5000);
  }, []);

  // --- AUTOSAVE LOGIC ---
  useEffect(() => {
    try {
        const savedDataString = localStorage.getItem('phoenix_autosave');
        if (savedDataString) {
            const savedData = JSON.parse(savedDataString);
            if (savedData.launcherSettings && savedData.games) {
                setAutosaveToLoad(savedData);
                debugService.log("App: Found autosave data in local storage.");
            }
        }
    } catch (error) {
        debugService.log("App: Failed to load autosave from localStorage", { error });
        localStorage.removeItem('phoenix_autosave');
    }
  }, []);

  const downloadProjectFile = useCallback((data: PhoenixProject, isAutosave: boolean) => {
    try {
        const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
        const filename = isAutosave
          ? `phoenix_project_autosave_${timestamp}.json`
          : `phoenix_project_${timestamp}.json`;
        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
        const link = document.createElement('a');
        link.href = jsonString;
        link.download = filename;
        link.click();
        return true;
    } catch(error) {
        debugService.log('App: Project file download failed', { error });
        showToast('Failed to prepare project file for download.', 'error');
        return false;
    }
  }, [showToast]);

  useEffect(() => {
    if (isProgrammaticChange.current) {
        isProgrammaticChange.current = false;
        setSaveStatus('saved');
        return;
    }

    setSaveStatus('unsaved');
    if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);

    autosaveTimeoutRef.current = window.setTimeout(() => {
        setSaveStatus('saving');
        try {
            localStorage.setItem('phoenix_autosave', JSON.stringify(projectData));
            debugService.log("App: Project autosaved to local storage.");

            if (settings.autosaveFileDownloadEnabled) {
                const now = Date.now();
                if (now - lastFileSaveTimestampRef.current > 30000) { // Throttle file downloads to 30s
                    if (downloadProjectFile(projectData, true)) {
                        lastFileSaveTimestampRef.current = now;
                        debugService.log("App: Project autosaved to file.");
                        showToast("Project autosaved to file.", "success");
                    }
                }
            }
            setTimeout(() => setSaveStatus('saved'), 500); // Visual feedback
        } catch (error) {
            debugService.log("App: Autosave to localStorage failed", { error });
            showToast("Autosave failed. Your browser storage might be full.", "error");
            setSaveStatus('unsaved');
        }
    }, 3000); // 3-second debounce

    return () => {
        if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);
    };
  }, [projectData, settings.autosaveFileDownloadEnabled, showToast, downloadProjectFile]);
  
  const loadAutosave = () => {
      if (autosaveToLoad) {
          isProgrammaticChange.current = true;
          editorHistory.clearAndPush(autosaveToLoad);
          setAutosaveToLoad(null);
          showToast("Restored session from autosave.", "success");
      }
  };

  const dismissAutosave = () => {
      setAutosaveToLoad(null);
  };
  
  // Subscribe to Editor History
  useEffect(() => {
    debugService.log("App: Component mounted", { initialProject });
    const unsubscribe = editorHistory.subscribe(() => {
        const currentData = editorHistory.current();
        if (currentData) setProjectData(currentData);
        setCanUndoEditor(editorHistory.canUndo());
        setCanRedoEditor(editorHistory.canRedo());
        debugService.log("App: Editor History update received", { canUndo: editorHistory.canUndo(), canRedo: editorHistory.canRedo() });
    });
    return unsubscribe;
  }, [editorHistory]);

  // Subscribe to Simulation History
  useEffect(() => {
      if (!simHistory) return;
      const unsubscribe = simHistory.subscribe(() => {
          const currentSimData = simHistory.current();
          if (currentSimData) {
              setSimulationProject(currentSimData);
          }
          setCanUndoSim(simHistory.canUndo());
          setCanRedoSim(simHistory.canRedo());
      });
      return unsubscribe;
  }, [simHistory]);
  
  const handleUndo = useCallback(() => {
      if (viewMode === 'simulation' && simHistory) simHistory.undo();
      else editorHistory.undo();
  }, [viewMode, editorHistory, simHistory]);
  
  const handleRedo = useCallback(() => {
      if (viewMode === 'simulation' && simHistory) simHistory.redo();
      else editorHistory.redo();
  }, [viewMode, editorHistory, simHistory]);

  useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
          if ((event.ctrlKey || event.metaKey)) {
              if (event.key === 'z') {
                  event.preventDefault();
                  if (event.shiftKey) handleRedo(); else handleUndo();
              } else if (event.key === 'y') {
                  event.preventDefault();
                  handleRedo();
              }
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  const commitChange = useCallback((newProjectData: PhoenixProject) => {
      isProgrammaticChange.current = false; // User-driven change
      editorHistory.push(newProjectData);
  }, [editorHistory]);

  const handleStartSimulation = (game: GameData) => {
      debugService.log("App: Starting simulation for game", { gameTitle: game.gameTitle });
      const gameCopy = JSON.parse(JSON.stringify(game));
      setSimulationProject(gameCopy);
      setViewMode('simulation');
  };

  const handleExitSimulation = () => {
      debugService.log("App: Exiting simulation");
      setSimulationProject(null);
      setViewMode('editor');
  };
  
  const handleRestartSimulation = () => {
      if (!simulationProject) return;
      const originalGame = projectData.games.find(g => g.id === simulationProject.id);
      if (originalGame) {
          debugService.log("App: Restarting simulation", { gameTitle: originalGame.gameTitle });
          const gameCopy = JSON.parse(JSON.stringify(originalGame));
          setSimulationProject(gameCopy);
      }
  };
  
  const handleLoadSimulation = (saveSlot: SimSaveSlot) => {
      debugService.log("App: Loading simulation state from slot", { slotName: saveSlot.name });
      const gameCopy = JSON.parse(JSON.stringify(saveSlot.data));
      setSimulationProject(gameCopy);
  }

  const handleChoiceOutcomes = (outcomes: ChoiceOutcome[]) => {
      if (!simHistory || !simulationProject) return;
      debugService.log("App: Applying outcomes to simulation", { outcomes });
      
      let gameToUpdate = { ...simHistory.current()! };

      for (const outcome of outcomes) {
          let nextData: GameData;
          if (outcome.type === 'create_entity') {
              const newEntity = { id: `entity_${Date.now()}`, templateId: outcome.templateId, name: outcome.name, attributeValues: outcome.attributeValues || {} };
              nextData = { ...gameToUpdate, entities: [...gameToUpdate.entities, newEntity] };
          } else if (outcome.type === 'update_entity') {
              nextData = {
                  ...gameToUpdate,
                  entities: gameToUpdate.entities.map(entity => 
                      entity.id === outcome.targetEntityId ? { ...entity, attributeValues: { ...entity.attributeValues, [outcome.attributeId]: outcome.value } } : entity
                  )
              };
          } else { nextData = gameToUpdate; }
          gameToUpdate = nextData;
      }

      debugService.log("App: Pushing new simulation state after outcomes", { gameData: gameToUpdate });
      simHistory.push(gameToUpdate);
  };
  
  const handleSaveProject = () => {
    debugService.log('App: Saving project manually', { projectData });
    if(downloadProjectFile(projectData, false)) {
        showToast('Project saved successfully!');
    }
  };

  const handleLoadProject = (jsonString: string) => {
    try {
      debugService.log('App: Attempting to load project from string', { length: jsonString.length });
      const loadedData = JSON.parse(jsonString);
      if (loadedData.launcherSettings && loadedData.games) {
        loadedData.games.forEach((game: GameData & { choices?: any }) => {
            if (game.choices && !game.allChoices) {
                debugService.log("App: Migrating old game data structure", { gameTitle: game.gameTitle });
                game.allChoices = game.choices;
                delete game.choices;
                if (!game.choiceChunks || game.choiceChunks.length === 0) {
                    game.choiceChunks = [{
                        id: `chunk_migrated_${Date.now()}`,
                        name: 'Imported Scenes',
                        description: 'All scenes from a previous version.',
                        choiceIds: game.allChoices.map(c => c.id),
                    }];
                }
            }
        });
        isProgrammaticChange.current = true;
        editorHistory.clearAndPush(loadedData);
        showToast('Project loaded successfully!');
      } else {
        debugService.log('App: Project load failed - invalid format');
        showToast('Failed to load project: Invalid file format.', 'error');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      debugService.log('App: Project load failed with error', { error });
      showToast(`Failed to load project: ${errorMessage}`, 'error');
    }
  };

  const currentView = useMemo(() => {
    switch (viewMode) {
      case 'editor':
        return (
          <PhoenixEditor 
            projectData={projectData} 
            onCommitChange={commitChange} 
            onLoadProject={handleLoadProject} 
            onSaveProject={handleSaveProject} 
            onStartSimulation={handleStartSimulation} 
            showToast={showToast}
          />
        );
      case 'launcher':
        return <MegaWattGame projectData={projectData} onStartSimulation={handleStartSimulation} onChoiceMade={() => {}} />;
      case 'simulation':
        if (simulationProject) {
          // FIX: Removed unused 'projectData' prop from SimulationScreen call.
          return <SimulationScreen gameData={simulationProject} onChoiceMade={handleChoiceOutcomes} />;
        }
        setViewMode('editor');
        return null;
      default:
        return <div>Invalid view mode</div>;
    }
  }, [viewMode, projectData, simulationProject, commitChange, handleLoadProject, handleSaveProject, handleStartSimulation, showToast, handleChoiceOutcomes]);

  return (
    <div className="flex flex-col h-screen font-sans bg-[var(--bg-main)]">
      {viewMode !== 'simulation' ? (
        <header className="flex items-center justify-between p-2 pl-4 border-b border-[var(--border-primary)] bg-[var(--bg-panel)]/50 backdrop-blur-sm flex-shrink-0 z-20">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold">Phoenix Engine</h1>
             <div className="flex items-center space-x-1 bg-[var(--bg-panel-light)] p-1 rounded-lg">
                <button 
                    onClick={() => setViewMode('editor')} 
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${viewMode === 'editor' ? 'bg-[var(--bg-active)] text-[var(--text-on-accent)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}
                >
                    Editor
                </button>
                <button 
                    onClick={() => setViewMode('launcher')} 
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${viewMode === 'launcher' ? 'bg-[var(--bg-active)] text-[var(--text-on-accent)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}
                >
                    Launcher
                </button>
            </div>
            <div className="flex items-center space-x-1 bg-[var(--bg-panel-light)] p-1 rounded-lg">
              <button onClick={handleUndo} disabled={!canUndoEditor} className="p-1.5 text-[var(--text-secondary)] rounded-md transition-colors hover:bg-[var(--bg-hover)] disabled:text-[var(--text-tertiary)] disabled:cursor-not-allowed" title="Undo (Ctrl+Z)">
                <ArrowUturnLeftIcon className="w-5 h-5"/>
              </button>
              <button onClick={handleRedo} disabled={!canRedoEditor} className="p-1.5 text-[var(--text-secondary)] rounded-md transition-colors hover:bg-[var(--bg-hover)] disabled:text-[var(--text-tertiary)] disabled:cursor-not-allowed" title="Redo (Ctrl+Y)">
                <ArrowUturnRightIcon className="w-5 h-5"/>
              </button>
            </div>
            <div className="text-xs text-[var(--text-tertiary)] w-28 text-left transition-colors duration-300">
                {saveStatus === 'saving' && 'Saving...'}
                {saveStatus === 'saved' && 'All changes saved'}
                {saveStatus === 'unsaved' && <span className="text-[var(--text-warning)] font-semibold">Unsaved changes...</span>}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSettingsModalOpen(true)} className="p-2 text-[var(--text-secondary)] rounded-md hover:bg-[var(--bg-hover)]">
               <Cog6ToothIcon className="w-5 h-5"/>
            </button>
          </div>
        </header>
      ) : (
        simulationProject && (
           <SimulationHeader 
            gameTitle={simulationProject.gameTitle}
            onExit={handleExitSimulation}
            onRestart={handleRestartSimulation}
            onLoad={handleLoadSimulation}
            currentSimState={simulationProject}
            canUndo={canUndoSim}
            canRedo={canRedoSim}
            onUndo={handleUndo}
            onRedo={handleRedo}
          />
        )
      )}

      {/* Main Content */}
      <main className="flex-1 min-h-0">
        {currentView}
      </main>

      {/* Modals & Toasts */}
      {autosaveToLoad && <AutosavePrompt onConfirm={loadAutosave} onDismiss={dismissAutosave} />}
      <SettingsModal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} />
      <Toast 
        message={toast.message}
        show={toast.show}
        onClose={() => setToast(p => ({...p, show: false}))}
      />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <SettingsProvider>
        <GlobalStyles />
        <AppContent />
      </SettingsProvider>
    </ErrorBoundary>
  );
};
// FIX: Add default export for the App component so it can be imported in index.tsx
export default App;
