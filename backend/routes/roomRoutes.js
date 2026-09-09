// DELETE /api/rooms/:id
router.delete('/rooms/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Regra de segurança: Impede que a sala Geral (ID: 100000) seja deletada
    if (id === '100000' || id === 'Geral') {
      return res.status(400).json({ error: 'A sala Geral não pode ser deletada.' });
    }

    // Exemplo com Mongoose (ajuste conforme o seu ORM/banco)
    const deletedRoom = await Room.findOneAndDelete({ roomId: id });

    if (!deletedRoom) {
      return res.status(404).json({ error: 'Sala não encontrada.' });
    }

    // Opcional: Apagar também todas as mensagens vinculadas a essa sala
    await Message.deleteMany({ roomId: id });

    return res.status(200).json({ message: 'Sala e mensagens deletadas com sucesso.' });
  } catch (error) {
    console.error('Erro ao deletar sala:', error);
    return res.status(500).json({ error: 'Erro interno ao deletar sala.' });
  }
});