// Hardcoded pet taxonomy for the Boarding intake form.
// Staff only choose; add more here as needed.

export const PET_TYPES = ["Dog", "Cat", "Bird", "Fish", "Reptile", "Small Animal", "Insect / Feeder"] as const;
export type PetType = (typeof PET_TYPES)[number];

export const BREEDS: Record<string, string[]> = {
  Dog: [
    "Labrador Retriever", "Golden Retriever", "German Shepherd", "Poodle", "Shih Tzu",
    "Pomeranian", "Chihuahua", "Beagle", "Bulldog", "Husky", "Maltese", "Yorkshire Terrier",
    "Dachshund", "Rottweiler", "Doberman", "Local / Mixed",
  ],
  Cat: [
    "Persian", "Siamese", "Maine Coon", "British Shorthair", "Scottish Fold", "Ragdoll",
    "Bengal", "Sphynx", "Turkish Angora", "Domestic Shorthair (DSH)", "Local / Mixed",
  ],
  Bird: [
    "Budgerigar (Budgie)", "Cockatiel", "Finch", "Ringneck Parakeet", "African Grey",
    "Parrot", "Lovebird", "Macaw", "Cockatoo", "Conure", "Canary", "Dove / Pigeon", "Other Bird",
  ],
  Fish: [
    "Goldfish", "Betta", "Guppy", "Molly", "Platy", "Tetra", "Angelfish", "Oscar", "Koi",
    "Cichlid", "Arowana", "Discus", "Gourami", "Corydoras", "Pleco", "Shrimp", "Snail",
    "Axolotl", "Other Fish / Aquatic",
  ],
  Reptile: [
    "Chameleon", "Leopard Gecko", "African Fat-Tailed Gecko", "Bearded Dragon",
    "Water Turtle", "Sulcata Tortoise", "Greek Tortoise", "Red-Eared Slider", "Corn Snake",
    "Ball Python", "King Snake", "Milk Snake", "Iguana", "Uromastyx", "Tarantula", "Scorpion",
    "Other Reptile",
  ],
  "Small Animal": [
    "Hamster", "Guinea Pig", "Rabbit", "Sugar Glider", "Fancy Mouse", "Rat", "Degu",
    "Gerbil", "Chinchilla", "Ferret", "Hedgehog", "Other Small Animal",
  ],
  "Insect / Feeder": [
    "Dubia Roach", "Cricket", "Mealworm", "Superworm", "Red Runner Roach", "Waxworm",
    "Fruit Fly", "Springtail", "Isopod", "Other Feeder Insect",
  ],
};

export const COLORS = [
  "Black", "White", "Brown", "Golden", "Cream", "Grey", "Tan", "Fawn",
  "Black & White", "Brown & White", "Tricolor", "Brindle", "Spotted",
  "Orange", "Yellow", "Green", "Blue", "Multicolor", "Other",
];

export function breedsFor(type: string): string[] {
  return BREEDS[type] ?? ["Other"];
}
