import { apiRequest } from "../../lib/api";

export type Character = {
  id: string;
  name: string;
  role: string;
  description: string;
  symbol: string;
};

export async function getCharacters(
  signal?: AbortSignal,
): Promise<Character[]> {
  const response = await apiRequest<{
    data: {
      characters: Character[];
    };
  }>("/characters", { signal });

  return response.data.characters;
}

export async function selectCharacter(characterId: string): Promise<string> {
  const response = await apiRequest<{
    data: {
      characterId: string;
    };
  }>("/characters/selection", {
    method: "POST",
    json: { characterId },
  });

  return response.data.characterId;
}
