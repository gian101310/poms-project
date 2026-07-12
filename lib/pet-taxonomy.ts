// Hardcoded pet taxonomy for the Boarding intake form.
// Staff only choose; add more here as needed.

export const PET_TYPES = ["Dog", "Cat", "Bird", "Fish", "Reptile", "Small Animal"] as const;
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
    "Budgerigar (Budgie)", "Cockatiel", "Lovebird", "African Grey", "Macaw", "Cockatoo",
    "Conure", "Canary", "Finch", "Parakeet", "Dove / Pigeon", "Other",
  ],
  Fish: [
    "Goldfish", "Betta", "Guppy", "Molly", "Tetra", "Angelfish", "Oscar", "Koi",
    "Cichlid", "Arowana", "Other",
  ],
  Reptile: [
    "Bearded Dragon", "Leopard Gecko", "Ball Python", "Corn Snake", "Iguana",
    "Red-Eared Slider (Turtle)", "Tortoise", "Chameleon", "Other",
  ],
  "Small Animal": [
    "Rabbit", "Guinea Pig", "Hamster", "Gerbil", "Mouse", "Rat", "Chinchilla",
    "Ferret", "Hedgehog", "Sugar Glider", "Other",
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
