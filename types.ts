

export interface AttributeDefinition {
  id: string;
  name: string;
  type: 'string' | 'textarea' | 'number' | 'entity_reference';
  // If type is 'entity_reference', this is the ID of the template being referenced.
  referencedTemplateId?: string | null;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  tags: string[];
  attributes: AttributeDefinition[];
}

export interface Entity {
  id:string;
  templateId: string;
  name: string;
  attributeValues: {
    // The key is the AttributeDefinition id
    // The value can be a string, a number, or an entity ID for references
    [attributeId: string]: string | number | null;
  };
}

export interface ChoiceOutcomeCreateEntity {
  type: 'create_entity';
  templateId: string;
  name: string;
  attributeValues?: {
    [attributeId: string]: string | number | null;
  };
}

export interface ChoiceOutcomeUpdateEntity {
    type: 'update_entity';
    targetEntityId: string;
    attributeId: string;
    value: string | number | null;
}

export type ChoiceOutcome = ChoiceOutcomeCreateEntity | ChoiceOutcomeUpdateEntity;

export interface ChoiceOption {
  id: string;
  card: Omit<StoryCard, 'id' | 'choiceId'>;
  outcome: ChoiceOutcome;
}

export interface PlayerChoice {
  id: string;
  name: string;
  prompt: string;
  choiceType: 'static' | 'dynamic_from_template';

  // Used if choiceType is 'static'
  staticOptions?: ChoiceOption[];

  // Used if choiceType is 'dynamic_from_template'
  dynamicConfig?: {
      sourceTemplateId: string;
      cardTemplate: Omit<StoryCard, 'id' | 'choiceId'>; // Placeholders like {entity.name} will be used here.
      // The `value` for the outcome will be the chosen entity's ID.
      outcomeTemplate: Omit<ChoiceOutcomeUpdateEntity, 'value'>; 
  };
  
  styles?: {
      layout?: 'grid' | 'carousel';
  }
}

export interface StoryCard {
  id: string;
  description: string;
  imagePrompt: string;
  imageBase64?: string; // Can be from AI gen (raw base64) or upload (data URL)
  foregroundImageBase64?: string; // Will be a data URL from upload
  choiceId?: string; // Links to a PlayerChoice
  styles?: {
    textPosition?: 'top' | 'middle' | 'bottom';
    textAlign?: 'left' | 'center' | 'right';
    textColor?: 'light' | 'dark';
    overlayStrength?: 'none' | 'light' | 'medium' | 'heavy';
    backgroundAnimation?: 'none' | 'kenburns-subtle' | 'kenburns-normal' | 'pan-left' | 'pan-right' | 'zoom-out';
    backgroundAnimationDuration?: number;
    fontFamily?: 'sans' | 'serif' | 'mono';
    fontSize?: 'normal' | 'large' | 'xlarge';
    textWidth?: 'narrow' | 'medium' | 'wide';
    backgroundEffect?: 'none' | 'blur' | 'darken';
    cardTransition?: 'fade' | 'slide-left' | 'slide-up' | 'zoom-in' | 'dissolve';
    cardTransitionDuration?: number;
    textAnimation?: 'none' | 'fade-in' | 'rise-up' | 'typewriter';
    textAnimationDuration?: number;
    textAnimationDelay?: number;
    foregroundImageStyles?: {
      position?: 'left' | 'center' | 'right';
      size?: 'small' | 'medium' | 'large';
      animation?: 'none' | 'fade-in' | 'slide-in-left' | 'slide-in-right' | 'zoom-in';
      animationDuration?: number;
      animationDelay?: number;
    };
    // Styles specific to choice cards
    borderWidth?: 'none' | 'sm' | 'md' | 'lg';
    borderColor?: string; // e.g., 'cyan-500'
  };
}


export interface GameData {
  colonyName: string;
  story: StoryCard[];
  choices: PlayerChoice[];
  templates: Template[];
  entities: Entity[];
}
