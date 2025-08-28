
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
  id: string;
  templateId: string;
  name: string;
  attributeValues: {
    // The key is the AttributeDefinition id
    // The value can be a string, a number, or an entity ID for references
    [attributeId: string]: string | number | null;
  };
}

export interface StoryCard {
  id: string;
  description: string;
  imagePrompt: string;
  imageBase64?: string; // Can be from AI gen (raw base64) or upload (data URL)
  foregroundImageBase64?: string; // Will be a data URL from upload
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
  };
}


export interface GameData {
  colonyName: string;
  story: StoryCard[];
  templates: Template[];
  entities: Entity[];
}