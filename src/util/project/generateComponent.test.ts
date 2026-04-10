jest.mock('fs-extra', () => ({
  __esModule: true,
  default: {
    mkdir: jest.fn(),
    emptyDir: jest.fn(),
    writeFile: jest.fn(),
    copy: jest.fn(),
    remove: jest.fn(),
  },
  pathExists: jest.fn(),
  emptyDir: jest.fn(),
  remove: jest.fn(),
}));
jest.mock('@inquirer/prompts');
jest.mock('../../lib/log.js');
jest.mock('../fs/findFileInCurrentPath.js');

import { select, confirm } from '@inquirer/prompts';
import { pathExists } from 'fs-extra';
import log from '../../lib/log.js';
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

const pathExistsMock = (pathExists as jest.Mock).mockResolvedValue(true);

describe('generateComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    pathExistsMock.mockResolvedValue(true);
  });

  it('throws an error if the user is not within an Emulsify project', async () => {
    expect.assertions(1);
    findFileMock.mockReturnValueOnce(undefined);
    await expect(generateComponent(variant, 'button')).rejects.toThrow(
      'Unable to find an Emulsify project to create the component into.',
    );
  });

  it('should prompt for the format and then the directory if not provided', async () => {
    expect.assertions(2);
    (select as jest.Mock)
      .mockResolvedValueOnce('default') // format
      .mockResolvedValueOnce('base'); // directory

    await generateComponent(variant, 'button');
    expect(select).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('Choose the component format:'),
      }),
    );
    expect(select).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining(
          'Choose a directory for the new component:',
        ),
      }),
    );
  });

  it('throws an error if the component structure is invalid', async () => {
    expect.assertions(1);
    (select as jest.Mock).mockResolvedValueOnce('default'); // format
    await expect(
      generateComponent(variant, 'button', 'cornpop'),
    ).rejects.toThrow(
      'The structure (cornpop) specified within the component button is invalid.',
    );
  });

  it('should cancel component creation if user declines overwrite', async () => {
    expect.assertions(2);
    (select as jest.Mock).mockResolvedValueOnce('default'); // format
    // Mock parent path exists, and destination exists
    pathExistsMock.mockResolvedValue(true);
    (confirm as jest.Mock).mockResolvedValueOnce(false); // decline overwrite

    const result = await generateComponent(variant, 'link', 'base');
    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('already exists'),
      }),
    );
    expect(result).toBeUndefined(); // Returns early after logging cancellation
  });

  it('should continue creation if user confirms overwrite', async () => {
    expect.assertions(2);
    (select as jest.Mock).mockResolvedValueOnce('default'); // format
    pathExistsMock.mockResolvedValue(true);
    (confirm as jest.Mock).mockResolvedValueOnce(true); // confirm overwrite

    await generateComponent(variant, 'link', 'base');
    expect(confirm).toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(
      'success',
      expect.stringContaining('Success!'),
    );
  });

  it('should create an SDC component structure', async () => {
    expect.assertions(1);
    (select as jest.Mock)
      .mockResolvedValueOnce('sdc') // format
      .mockResolvedValueOnce('base'); // directory
    // Mock parent path exists, but destination does NOT exist
    pathExistsMock.mockImplementation((p) => !p.endsWith('mario'));

    await generateComponent(variant, 'mario');
    expect(log).toHaveBeenCalledWith(
      'success',
      expect.stringContaining('Success!'),
    );
  });

  it('should generate a standard (Default) component when selected', async () => {
    (select as jest.Mock)
      .mockResolvedValueOnce('default') // Format selection
      .mockResolvedValueOnce('base'); // Directory selection
    pathExistsMock.mockResolvedValue(false);

    await generateComponent(variant, 'my-button');

    expect(log).toHaveBeenCalledWith(
      'success',
      expect.stringContaining('Success!'),
    );
  });
});
