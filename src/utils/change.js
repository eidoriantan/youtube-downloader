
export function handleChange (setter) {
  return (event) => {
    const input = event.target;
    setter(input.type === 'checkbox' ? (val => !val) : input.value);
  }
}

export function handleFileChange (setter) {
  return (event) => {
    const input = event.target;
    setter(input.type === 'file' ? input.files[0] : input.value);
  }
}
