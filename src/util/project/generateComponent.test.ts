jest.mock('fs-extra', () => ({
  pathExists: jest.fn(),
}));
jest.mock('inquirer');
jest.mock('../../lib/log.js');
jest.mock('../fs/findFileInCurrentPath.js');

import inquirer from 'inquirer';
import { pathExists } from 'fs-extra';
import generateComponent from './generateComponent.js';
import { EmulsifyVariant } from '@emulsify-cli/config';
import findFileInCurrentPath from '../fs/findFileInCurrentPath.js';

const findFileMock = (findFileInCurrentPath as jest.Mock).mockReturnValue(
  '/home/uname/Projects/cornflake/web/themes/custom/themename/project.emulsify.json',
);

const variant = {
  structureImplementations: [
    {
      name: 'base',
      directory: './components/00-base',
    },
  ],
  components: [
    {
      name: 'link',
      structure: 'base',
    },
  ],
} as EmulsifyVariant;

const pathExistsMock = (pathExists as jest.Mock).mockResolvedValue(false);

describe('generateComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws an error if the user is not within an Emulsify project', async () => {
    expect.assertions(1);
    findFileMock.mockReturnValueOnce(undefined);
    await expect(generateComponent(variant, 'button')).rejects.toThrow(
      'Unable to find an Emulsify project to create the component into.',
    );
  });

  it('should prompt for the directory if not provided', async () => {
    expect.assertions(1);
    const mockPrompt = jest.spyOn(inquirer, 'prompt').mockResolvedValueOnce({
      directory: 'base',
    });

    await generateComponent(variant, 'button');
    expect(mockPrompt).toHaveBeenCalledWith({
      type: 'list',
      name: 'directory',
      message: 'Choose a directory for the new component:',
      choices: variant.structureImplementations,
    });
    mockPrompt.mockRestore();
  });

  it('throws an error if the component structure is invalid', async () => {
    expect.assertions(1);
    await expect(
      generateComponent(variant, 'button', 'cornpop'),
    ).rejects.toThrow(
      'The structure (cornpop) specified within the component button is invalid.',
    );
  });

  it('throws an error if the component already exists', async () => {
    expect.assertions(1);
    pathExistsMock.mockResolvedValueOnce(true);
    await expect(generateComponent(variant, 'link', 'base')).rejects.toThrow(
      'The link component already exists in ./components/00-base',
    );
  });
});
