export const formatRelativeTime = (date: Date | string) => {
  const rt = new Intl.RelativeTimeFormat('en-US', {
    style: 'narrow',
  });

  const now = new Date();
  const endTime = new Date(date);
  const diffInMs = endTime.getTime() - now.getTime();
  const diffInSecs = diffInMs / 1000;
  const diffInMins = diffInSecs / 60;
  const diffInHours = diffInMins / 60;
  const diffInDays = diffInHours / 24;
  const diffInMonths = diffInDays / 30;
  const diffInYears = diffInDays / 365;

  if (Math.abs(diffInYears) >= 1) {
    return rt.format(Math.round(diffInYears), 'year');
  }
  if (Math.abs(diffInMonths) >= 1) {
    return rt.format(Math.round(diffInMonths), 'month');
  }
  if (Math.abs(diffInDays) >= 1) {
    return rt.format(Math.round(diffInDays), 'day');
  }
  if (Math.abs(diffInHours) >= 1) {
    return rt.format(Math.round(diffInHours), 'hour');
  }
  if (Math.abs(diffInMins) >= 1) {
    return rt.format(Math.round(diffInMins), 'minute');
  }
  return rt.format(Math.round(diffInSecs), 'second');
};
