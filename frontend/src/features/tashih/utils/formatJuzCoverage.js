export const formatJuzCoverage = ({ juzItems = [], juzFrom, juzTo } = {}) => {
  const start = Number(juzFrom);
  const end = Number(juzTo);

  if (Number.isInteger(start) && Number.isInteger(end) && start > 0 && end >= start) {
    return start === end ? `Juz ${start}` : `Juz ${start}–${end}`;
  }

  const numbers = [...new Set(
    (Array.isArray(juzItems) ? juzItems : [])
      .map((item) => Number(item?.juz_number ?? item))
      .filter((number) => Number.isInteger(number) && number > 0)
  )].sort((a, b) => a - b);

  if (numbers.length === 0) return null;

  const ranges = [];
  let rangeStart = numbers[0];
  let rangeEnd = numbers[0];

  for (const number of numbers.slice(1)) {
    if (number === rangeEnd + 1) {
      rangeEnd = number;
      continue;
    }

    ranges.push(rangeStart === rangeEnd ? `${rangeStart}` : `${rangeStart}–${rangeEnd}`);
    rangeStart = number;
    rangeEnd = number;
  }

  ranges.push(rangeStart === rangeEnd ? `${rangeStart}` : `${rangeStart}–${rangeEnd}`);
  return `Juz ${ranges.join(', ')}`;
};
