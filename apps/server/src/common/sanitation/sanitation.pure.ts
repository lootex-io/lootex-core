import { Profanity, ProfanityOptions } from '@2toad/profanity';
import { CENSORED_WORDS } from '../utils/censor';

const options = new ProfanityOptions();
options.wholeWord = true;

const profanity = new Profanity(options);
profanity.addWords(CENSORED_WORDS);

export const ProfanityUtil = {
  /**
   * @function hasProfanity
   * @summary checks profanity in content, word-break on
   * @param {String} value input to check for profanity
   * @return {Boolean} hasProfanity
   */
  hasProfanity(value: string) {
    const rawResult: boolean = profanity.exists(value);
    const replacedResult: boolean = profanity.exists(value.replace('_', ''));
    return rawResult || replacedResult;
  },
  /**
   * @function censorInput
   * @summary converts bad words to @#$!
   * @param {String} value input to check for profanity
   * @return {String} censoredValue
   */
  censorInput(value: string) {
    return profanity.censor(value);
  },
};
