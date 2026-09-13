/**
 * Tags are descriptive metadata, not navigation: with five essays the tag
 * index was ten labels, nine of them leading to a single post. They render as
 * quiet labels so the information survives without the dead ends.
 */
const Tag = ({ text }: { text: string }) => (
  // A separator keeps adjacent tags from reading as one phrase
  // ("TEACHING REFLECTION").
  <li className="text-xs uppercase tracking-[0.08em] text-zinc-500 before:mr-3 before:text-zinc-300 before:content-['·'] first:before:hidden dark:text-zinc-400 dark:before:text-zinc-700">
    {text}
  </li>
);

export default Tag;
