export function levenshteinDistance(firstString: string, secondString: string): number {
  const firstLength = firstString.length;
  const secondLength = secondString.length;

  if (firstLength === 0) return secondLength;
  if (secondLength === 0) return firstLength;

  const distanceMatrix: number[][] = Array.from({ length: firstLength + 1 }, () =>
    new Array(secondLength + 1).fill(0)
  );

  for (let rowIndex = 0; rowIndex <= firstLength; rowIndex++) {
    distanceMatrix[rowIndex][0] = rowIndex;
  }

  for (let columnIndex = 0; columnIndex <= secondLength; columnIndex++) {
    distanceMatrix[0][columnIndex] = columnIndex;
  }

  for (let rowIndex = 1; rowIndex <= firstLength; rowIndex++) {
    for (let columnIndex = 1; columnIndex <= secondLength; columnIndex++) {
      const charactersMatch = firstString[rowIndex - 1] === secondString[columnIndex - 1];
      const substitutionCost = charactersMatch ? 0 : 1;

      const deletionCost = distanceMatrix[rowIndex - 1][columnIndex] + 1;
      const insertionCost = distanceMatrix[rowIndex][columnIndex - 1] + 1;
      const substitutionTotalCost =
        distanceMatrix[rowIndex - 1][columnIndex - 1] + substitutionCost;

      distanceMatrix[rowIndex][columnIndex] = Math.min(
        deletionCost,
        insertionCost,
        substitutionTotalCost
      );
    }
  }

  return distanceMatrix[firstLength][secondLength];
}

export function calculateSimilarityScore(firstString: string, secondString: string): number {
  const longerStringLength = Math.max(firstString.length, secondString.length) || 1;
  const editDistance = levenshteinDistance(firstString.toLowerCase(), secondString.toLowerCase());

  return 1 - editDistance / longerStringLength;
}
