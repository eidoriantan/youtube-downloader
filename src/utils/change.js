
export function handleChange (setter) {
  return (event) => {
    const input = event.target;
    setter(input.type === 'checkbox' ? (val => !val) : input.value);
  }
}
