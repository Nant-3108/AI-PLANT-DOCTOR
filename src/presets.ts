import earlyBlightImg from './assets/images/leaf_early_blight_1780428129010.png';
import healthyBasilImg from './assets/images/leaf_healthy_basil_1780428145055.png';
import cupOnDeskImg from './assets/images/cup_on_desk_1780428159609.png';

export interface Preset {
  id: string;
  name: string;
  description: string;
  type: 'diseased' | 'healthy' | 'non-plant';
  imageUrl: string;
}

export const PRESETS: Preset[] = [
  {
    id: 'early_blight',
    name: 'Tomato Leaf (Blight infected)',
    description: 'Has distinct dark target-like spots with yellow halos, classic symptoms of Early Blight.',
    type: 'diseased',
    imageUrl: earlyBlightImg,
  },
  {
    id: 'healthy_basil',
    name: 'Basil Leaf (Completely Healthy)',
    description: 'A crisp, leaf with clear green texture. Test the healthy verification gate.',
    type: 'healthy',
    imageUrl: healthyBasilImg,
  },
  {
    id: 'non_plant',
    name: 'Coffee Mug (No leaf present)',
    description: 'A standard ceramic coffee cup on a desk. Test the non-plant verification gate.',
    type: 'non-plant',
    imageUrl: cupOnDeskImg,
  },
];
